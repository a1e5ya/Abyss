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

// ── Spurs ─────────────────────────────────────────────────────────────────────
// junctionProgress maps to an exact spine point via evalSpline().
// This guarantees the spur visually starts on the curve, not beside it.
export interface Spur {
  label:            string
  junctionProgress: number
  object:           { x: number; y: number }
  color:            string
}

// Abyss3 waypoint = index 5 of 10 segments → progress 0.5.
// Four spurs spaced around that point, alternating left/right.
export const ABYSS3_SPURS: Spur[] = [
  { label: 'z-2', junctionProgress: 0.46, object: { x: 600,  y: 6600 }, color: 'rgba(45,212,191,0.5)'  },
  { label: 'z-1', junctionProgress: 0.48, object: { x: 1900, y: 6800 }, color: 'rgba(251,113,133,0.5)' },
  { label: 'z+1', junctionProgress: 0.52, object: { x: 600,  y: 7200 }, color: 'rgba(110,231,183,0.6)' },
  { label: 'z+2', junctionProgress: 0.54, object: { x: 1900, y: 7400 }, color: 'rgba(253,230,138,0.6)' },
]

export function spurJunction(s: Spur): { x: number; y: number } {
  return evalSpline(s.junctionProgress)
}

export function spurSvgPath(s: Spur): string {
  const j  = spurJunction(s)
  const mx = (j.x + s.object.x) / 2
  const my = (j.y + s.object.y) / 2
  return `M ${j.x.toFixed(1)} ${j.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${s.object.x} ${s.object.y}`
}

export function spurObjectAngle(s: Spur): number {
  const j  = spurJunction(s)
  const dx = s.object.x - j.x
  const dy = s.object.y - j.y
  return Math.atan2(dx, dy) * (180 / Math.PI)
}

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

  const worldTransform = computed(() =>
    `translate(50vw, 50vh) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  )

  return { cameraX, cameraY, rotation, worldTransform }
}
