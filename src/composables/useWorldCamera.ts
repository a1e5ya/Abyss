import { computed, ref } from 'vue'
import type { Ref } from 'vue'

export const WAYPOINTS = [
  { x: 2000, y: 0 },       // Hero
  { x: 1200, y: 1400 },    // Abyss 1
  { x: 2000, y: 2800 },    // Portrait Gallery
  { x: 2800, y: 4200 },    // Abyss 2
  { x: 2000, y: 5600 },    // Product Gallery
  { x: 1200, y: 7000 },    // Abyss 3
  { x: 2000, y: 8400 },    // Web Projects
  { x: 2800, y: 9800 },    // Abyss 4
  { x: 2000, y: 11200 },   // 3D Works
  { x: 1200, y: 12600 },   // Abyss 5
  { x: 2000, y: 14000 },   // Contacts
]

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

function evalSpline(pts: typeof WAYPOINTS, progress: number) {
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

// Numerical tangent — robust, works at any progress value
function evalTangent(progress: number) {
  const eps = 0.001
  const a = evalSpline(WAYPOINTS, Math.max(0, progress - eps))
  const b = evalSpline(WAYPOINTS, Math.min(1, progress + eps))
  return { dx: b.x - a.x, dy: b.y - a.y }
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
  const cameraX = computed(() => evalSpline(WAYPOINTS, pathProgress.value).x)
  const cameraY = computed(() => evalSpline(WAYPOINTS, pathProgress.value).y)

  const rotation = computed(() => {
    const { dx, dy } = evalTangent(pathProgress.value)
    return Math.atan2(dx, dy) * (180 / Math.PI)
  })

  const worldTransform = computed(() =>
    `translate(50vw, 50vh) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  )

  return { cameraX, cameraY, rotation, worldTransform }
}
