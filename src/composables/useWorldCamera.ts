import { computed } from 'vue'
import type { Ref } from 'vue'

// Each waypoint has a label for identification.
// The camera visits every waypoint in order.
export const WAYPOINTS = [
  { x: 2000, y: 0,     label: 'hero' },
  { x: 1200, y: 1400,  label: 'abyss1' },
  { x: 2000, y: 2800,  label: 'portrait' },
  { x: 2800, y: 4200,  label: 'abyss2' },
  { x: 2000, y: 5600,  label: 'product' },
  // Abyss 3 — main spine passes through x=1200, y=7000.
  // Four detours peel off the spine, visit an object, return.
  // Each detour: [exit point on spine] → [object] → [return to spine]
  { x: 1350, y: 6500,  label: 'abyss3-entry' },   // approaching abyss 3
  { x: 900,  y: 6750,  label: 'abyss3-z-2' },     // z−2 deep blob
  { x: 1200, y: 6900,  label: 'abyss3-r1' },      // return to spine
  { x: 1400, y: 7100,  label: 'abyss3-z-1' },     // z−1 mid blob
  { x: 1200, y: 7200,  label: 'abyss3-r2' },      // return to spine
  { x: 1100, y: 7400,  label: 'abyss3-z+1' },     // z+1 fore blob
  { x: 1200, y: 7550,  label: 'abyss3-r3' },      // return to spine
  { x: 1500, y: 7700,  label: 'abyss3-z+2' },     // z+2 sphere blob
  { x: 1200, y: 7900,  label: 'abyss3-exit' },    // exit abyss 3
  { x: 2000, y: 8400,  label: 'web' },
  { x: 2800, y: 9800,  label: 'abyss4' },
  { x: 2000, y: 11200, label: '3d' },
  { x: 1200, y: 12600, label: 'abyss5' },
  { x: 2000, y: 14000, label: 'contacts' },
]

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

// Progress value for a named waypoint
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
