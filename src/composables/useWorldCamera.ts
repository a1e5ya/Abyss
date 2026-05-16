import { computed, ref } from 'vue'
import type { Ref } from 'vue'

// ── Main spine waypoints ──────────────────────────────────────────────────────
export const WAYPOINTS = [
  { x: 2000, y: 0,     label: 'hero'     },
  { x: 1200, y: 1400,  label: 'abyss1'   },
  { x: 2000, y: 2800,  label: 'portrait' },
  { x: 2800, y: 4200,  label: 'abyss2'   },
  { x: 2000, y: 5600,  label: 'product'  },
  { x: 1200, y: 7000,  label: 'abyss3'   },
  { x: 2000, y: 8400,  label: 'web'      },
  { x: 2800, y: 9800,  label: 'abyss4'   },
  { x: 2000, y: 11200, label: '3d'       },
  { x: 1200, y: 12600, label: 'abyss5'   },
  { x: 2000, y: 14000, label: 'contacts' },
]

// ── Catmull-Rom spine math ────────────────────────────────────────────────────
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

export function evalSpline(progress: number): { x: number; y: number } {
  const pts  = WAYPOINTS
  const segs = pts.length - 1
  const scaled = Math.min(progress * segs, segs - 0.0001)
  const i  = Math.floor(scaled)
  const t  = scaled - i
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(pts.length - 1, i + 2)]
  return {
    x: cr(p0.x, p1.x, p2.x, p3.x, t),
    y: cr(p0.y, p1.y, p2.y, p3.y, t),
  }
}

function evalTangent(progress: number) {
  const eps = 0.001
  const a = evalSpline(Math.max(0, progress - eps))
  const b = evalSpline(Math.min(1, progress + eps))
  return { dx: b.x - a.x, dy: b.y - a.y }
}

export function progressOf(label: string): number {
  const i = WAYPOINTS.findIndex(w => w.label === label)
  return i < 0 ? 0 : i / (WAYPOINTS.length - 1)
}

export function getTangentAngle(progress: number): number {
  const { dx, dy } = evalTangent(progress)
  return Math.atan2(dx, dy) * (180 / Math.PI)
}

// Polyline approximation of the spine between two progress values.
// Used to draw a thick "wide spine" segment (e.g., Abyss 3 Sankey section).
export function buildSpineSegment(fromProgress: number, toProgress: number, steps = 40): string {
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const p = fromProgress + (toProgress - fromProgress) * (i / steps)
    const { x, y } = evalSpline(p)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
}

export function buildSvgPath(): string {
  const pts = WAYPOINTS
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`
  }
  return d
}

// ── Highpoints (Sankey / river style) ────────────────────────────────────────
// Each highpoint is a filled ribbon that fans from the spine to an object pool.
export interface Highpoint {
  label:            string
  junctionProgress: number
  object:           { x: number; y: number }
  color:            string
  width:            number
}

export const ABYSS3_HIGHPOINTS: Highpoint[] = [
  { label: 'z-2', junctionProgress: 0.46, object: { x: 620,  y: 6620 }, color: 'rgba(45,212,191,0.18)',  width: 90  },
  { label: 'z-1', junctionProgress: 0.48, object: { x: 1880, y: 6820 }, color: 'rgba(251,113,133,0.18)', width: 80  },
  { label: 'z+1', junctionProgress: 0.52, object: { x: 620,  y: 7180 }, color: 'rgba(110,231,183,0.18)', width: 75  },
  { label: 'z+2', junctionProgress: 0.54, object: { x: 1880, y: 7380 }, color: 'rgba(253,230,138,0.18)', width: 70  },
]

// Legacy aliases
export type Spur = Highpoint
export const ABYSS3_SPURS = ABYSS3_HIGHPOINTS

export function spurJunction(s: Highpoint): { x: number; y: number } {
  return evalSpline(s.junctionProgress)
}

// Thorn / branch shape — wide at the spine root, tapering to the object tip.
// Two cubic bezier edges grow from the spine junction, meeting at the object.
// Left edge curves one way, right edge the other — natural organic branch.
export function spurRibbonPath(s: Highpoint): string {
  const j  = spurJunction(s)
  const ox = s.object.x
  const oy = s.object.y
  const w  = s.width   // half-width at the root

  // Spine tangent — root direction
  const tang = evalTangent(s.junctionProgress)
  const tlen = Math.sqrt(tang.dx ** 2 + tang.dy ** 2) || 1
  const tx   = tang.dx / tlen   // along-spine unit
  const ty   = tang.dy / tlen
  const px   = -ty              // perpendicular unit (left)
  const py   =  tx

  // Root edge points on the spine (left and right of junction)
  const rlx = j.x + px * w
  const rly = j.y + py * w
  const rrx = j.x - px * w
  const rry = j.y - py * w

  // Vector from junction to object
  const dx   = ox - j.x
  const dy   = oy - j.y
  const dist = Math.sqrt(dx ** 2 + dy ** 2) || 1

  // Control points: each edge curves from its root corner toward the object.
  // The "bow" pushes each edge outward before converging at the tip.
  const bow = dist * 0.45
  const f   = (n: number) => n.toFixed(1)

  // Left edge: root-left → control (pushed left) → object tip
  const cl1x = rlx + dx * 0.5 + px * bow
  const cl1y = rly + dy * 0.5 + py * bow
  const cl2x = ox  + px * w * 0.15
  const cl2y = oy  + py * w * 0.15

  // Right edge: object tip → control (pushed right) → root-right
  const cr1x = ox  - px * w * 0.15
  const cr1y = oy  - py * w * 0.15
  const cr2x = rrx + dx * 0.5 - px * bow
  const cr2y = rry + dy * 0.5 - py * bow

  return [
    `M ${f(rlx)} ${f(rly)}`,
    `C ${f(cl1x)} ${f(cl1y)}, ${f(cl2x)} ${f(cl2y)}, ${f(ox)} ${f(oy)}`,   // left edge to tip
    `C ${f(cr1x)} ${f(cr1y)}, ${f(cr2x)} ${f(cr2y)}, ${f(rrx)} ${f(rry)}`, // right edge back
    `A ${f(w)} ${f(w)} 0 0 1 ${f(rlx)} ${f(rly)}`,  // arc closing the root
    'Z',
  ].join(' ')
}

// Centerline — straight bezier from junction to object tip
export function spurCenterPath(s: Highpoint): string {
  const j  = spurJunction(s)
  const ox = s.object.x
  const oy = s.object.y
  const mx = (j.x + ox) / 2
  const my = (j.y + oy) / 2
  const f  = (n: number) => n.toFixed(1)
  return `M ${f(j.x)} ${f(j.y)} Q ${f(mx)} ${f(my)}, ${f(ox)} ${f(oy)}`
}

export function spurObjectAngle(s: Spur): number {
  const j  = spurJunction(s)
  const dx = s.object.x - j.x
  const dy = s.object.y - j.y
  return Math.atan2(dx, dy) * (180 / Math.PI)
}

// Cursor world position — used by useDwell to detect hover over objects
export const cursorWorldX = ref(0)
export const cursorWorldY = ref(0)

// ── Camera override ───────────────────────────────────────────────────────────
// useDwell writes here to move the camera off-spine to an object.
// null = follow spine normally.
export const cameraOverridePos = ref<{ x: number; y: number } | null>(null)

// ── Main composable ───────────────────────────────────────────────────────────
export function useWorldCamera(pathProgress: Ref<number>) {
  const cameraX = computed(() =>
    cameraOverridePos.value !== null
      ? cameraOverridePos.value.x
      : evalSpline(pathProgress.value).x
  )
  const cameraY = computed(() =>
    cameraOverridePos.value !== null
      ? cameraOverridePos.value.y
      : evalSpline(pathProgress.value).y
  )

  const rotation = computed(() => {
    const { dx, dy } = evalTangent(pathProgress.value)
    return Math.atan2(dx, dy) * (180 / Math.PI)
  })

  // cursorNudge is injected by WorldContainer after useCursor() is available.
  // Default: no nudge. Using a module-level ref so it survives across composable calls.
  const worldTransform = computed(() => {
    const nx = cursorNudgeX.value
    const ny = cursorNudgeY.value
    // Nudge is applied BEFORE the camera translation — shifts the world in screen space
    return `translate(50vw, 50vh) translate(${-nx}px, ${-ny}px) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  })

  return { cameraX, cameraY, rotation, worldTransform }
}

// Written by WorldContainer from cursorSx/Sy
export const cursorNudgeX = ref(0)
export const cursorNudgeY = ref(0)
