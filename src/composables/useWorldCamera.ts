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

// Sankey ribbon — true flow shape.
// The centerline is a cubic bezier from junction to object, with control points
// that curve naturally based on the spine tangent at the junction.
// Both edges are the centerline offset perpendicularly by half-width,
// sampled at N points to build a smooth filled polygon.
// Width is uniform along the full length — no pinch, no flare.
export function spurRibbonPath(s: Highpoint): string {
  const j   = spurJunction(s)
  const ox  = s.object.x
  const oy  = s.object.y
  const w   = s.width
  const STEPS = 32

  // Spine tangent at junction gives the departure direction
  const tang = evalTangent(s.junctionProgress)
  const tlen = Math.sqrt(tang.dx * tang.dx + tang.dy * tang.dy) || 1
  const tx   = tang.dx / tlen
  const ty   = tang.dy / tlen

  // Centerline bezier: departs along spine tangent, arrives straight at object
  const dist  = Math.sqrt((ox - j.x) ** 2 + (oy - j.y) ** 2)
  const pull  = dist * 0.5
  const cp1x  = j.x + tx * pull
  const cp1y  = j.y + ty * pull
  const cp2x  = ox - (ox - j.x) / dist * pull * 0.4
  const cp2y  = oy - (oy - j.y) / dist * pull * 0.4

  // Sample centerline and compute per-point perpendicular
  function bezier(t: number) {
    const u = 1 - t
    return {
      x: u*u*u*j.x + 3*u*u*t*cp1x + 3*u*t*t*cp2x + t*t*t*ox,
      y: u*u*u*j.y + 3*u*u*t*cp1y + 3*u*t*t*cp2y + t*t*t*oy,
    }
  }
  function bezierTangent(t: number) {
    const u = 1 - t
    const dx = 3*(u*u*(cp1x-j.x) + 2*u*t*(cp2x-cp1x) + t*t*(ox-cp2x))
    const dy = 3*(u*u*(cp1y-j.y) + 2*u*t*(cp2y-cp1y) + t*t*(oy-cp2y))
    const len = Math.sqrt(dx*dx + dy*dy) || 1
    return { px: -dy/len, py: dx/len }  // perpendicular
  }

  const left:  string[] = []
  const right: string[] = []

  for (let i = 0; i <= STEPS; i++) {
    const t  = i / STEPS
    const pt = bezier(t)
    const { px, py } = bezierTangent(t)
    left.push(`${(pt.x + px * w).toFixed(1)},${(pt.y + py * w).toFixed(1)}`)
    right.push(`${(pt.x - px * w).toFixed(1)},${(pt.y - py * w).toFixed(1)}`)
  }

  const f = (n: number) => n.toFixed(1)
  return [
    `M ${left[0]}`,
    ...left.slice(1).map(p => `L ${p}`),
    `A ${f(w)} ${f(w)} 0 0 1 ${right[STEPS]}`,   // arc cap at object end
    ...right.slice(0, STEPS).reverse().map(p => `L ${p}`),
    `A ${f(w)} ${f(w)} 0 0 1 ${left[0]}`,         // arc cap at junction end
    'Z',
  ].join(' ')
}

// Centerline stroke — the bezier spine of the ribbon
export function spurCenterPath(s: Highpoint): string {
  const j  = spurJunction(s)
  const ox = s.object.x
  const oy = s.object.y

  const tang = evalTangent(s.junctionProgress)
  const tlen = Math.sqrt(tang.dx * tang.dx + tang.dy * tang.dy) || 1
  const tx   = tang.dx / tlen
  const ty   = tang.dy / tlen
  const dist = Math.sqrt((ox - j.x) ** 2 + (oy - j.y) ** 2)
  const pull = dist * 0.5
  const cp1x = j.x + tx * pull
  const cp1y = j.y + ty * pull
  const cp2x = ox - (ox - j.x) / dist * pull * 0.4
  const cp2y = oy - (oy - j.y) / dist * pull * 0.4

  const f = (n: number) => n.toFixed(1)
  return `M ${f(j.x)} ${f(j.y)} C ${f(cp1x)} ${f(cp1y)}, ${f(cp2x)} ${f(cp2y)}, ${f(ox)} ${f(oy)}`
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
