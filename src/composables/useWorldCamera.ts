import { computed } from 'vue'
import type { Ref } from 'vue'

// ── Main spine ────────────────────────────────────────────────────────────────
// One clean path through the world. Camera always follows this.
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

// ── Spurs ─────────────────────────────────────────────────────────────────────
// Each spur is a short sub-path that leaves the spine at a junction point,
// reaches an object, and is a dead-end (camera doesn't follow it automatically).
// They are purely geometric — used for SVG drawing and object placement.
export interface Spur {
  label: string
  junction: { x: number; y: number }  // where spur departs the spine
  object:   { x: number; y: number }  // where the object sits
  color: string
}

export const ABYSS3_SPURS: Spur[] = [
  {
    label:    'z-2',
    junction: { x: 1350, y: 6600 },
    object:   { x: 700,  y: 6700 },
    color:    'rgba(45,212,191,0.5)',
  },
  {
    label:    'z-1',
    junction: { x: 1050, y: 6850 },
    object:   { x: 550,  y: 7050 },
    color:    'rgba(251,113,133,0.5)',
  },
  {
    label:    'z+1',
    junction: { x: 1300, y: 7150 },
    object:   { x: 2800, y: 7050 },
    color:    'rgba(110,231,183,0.6)',
  },
  {
    label:    'z+2',
    junction: { x: 1050, y: 7350 },
    object:   { x: 2900, y: 7400 },
    color:    'rgba(253,230,138,0.6)',
  },
]

// Spur path as SVG string — straight line from junction to object
export function spurSvgPath(s: Spur): string {
  const mx = (s.junction.x + s.object.x) / 2
  const my = (s.junction.y + s.object.y) / 2 - 60
  return `M ${s.junction.x} ${s.junction.y} Q ${mx} ${my} ${s.object.x} ${s.object.y}`
}

// Tangent angle at the object end of a spur (for counter-rotating the object)
export function spurObjectAngle(s: Spur): number {
  const dx = s.object.x - s.junction.x
  const dy = s.object.y - s.junction.y
  return Math.atan2(dx, dy) * (180 / Math.PI)
}

// ── Catmull-Rom spine math ────────────────────────────────────────────────────
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

function evalSpline(progress: number) {
  const pts = WAYPOINTS
  const segs = pts.length - 1
  const scaled = Math.min(progress * segs, segs - 0.0001)
  const i = Math.floor(scaled)
  const t = scaled - i
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
  if (i < 0) return 0
  return i / (WAYPOINTS.length - 1)
}

export function getTangentAngle(progress: number): number {
  const { dx, dy } = evalTangent(progress)
  return Math.atan2(dx, dy) * (180 / Math.PI)
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

export function useWorldCamera(pathProgress: Ref<number>) {
  const cameraX = computed(() => evalSpline(pathProgress.value).x)
  const cameraY = computed(() => evalSpline(pathProgress.value).y)

  const rotation = computed(() => {
    const { dx, dy } = evalTangent(pathProgress.value)
    return Math.atan2(dx, dy) * (180 / Math.PI)
  })

  const worldTransform = computed(() =>
    `translate(50vw, 50vh) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  )

  return { cameraX, cameraY, rotation, worldTransform }
}
