import { computed } from 'vue'
import type { Ref } from 'vue'

// Waypoints along the world path — one per station and abyss zone.
// x swings ±800px left/right to create visible curves between stations.
// y matches the world coordinate layout from the spec.
const WAYPOINTS = [
  { x: 2000, y: 0 },       // Hero
  { x: 1200, y: 1400 },    // Abyss 1 — swing left
  { x: 2000, y: 2800 },    // Portrait Gallery
  { x: 2800, y: 4200 },    // Abyss 2 — swing right
  { x: 2000, y: 5600 },    // Product Gallery
  { x: 1200, y: 7000 },    // Abyss 3 — swing left
  { x: 2000, y: 8400 },    // Web Projects
  { x: 2800, y: 9800 },    // Abyss 4 — swing right
  { x: 2000, y: 11200 },   // 3D Works
  { x: 1200, y: 12600 },   // Abyss 5 — swing left
  { x: 2000, y: 14000 },   // Contacts
]

// Catmull-Rom spline: smooth curve through all waypoints.
// Given segment index and local t (0→1), returns interpolated value.
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

function catmullRomDerivative(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    (-p0 + p2) +
    2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
    3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t * t
  )
}

// Map global progress (0→1) to a segment index + local t
function progressToSegment(progress: number): { i: number; t: number } {
  const segments = WAYPOINTS.length - 1
  const scaled = progress * segments
  const i = Math.min(Math.floor(scaled), segments - 1)
  const t = scaled - i
  return { i, t }
}

function getPoint(progress: number): { x: number; y: number } {
  const { i, t } = progressToSegment(progress)
  const p0 = WAYPOINTS[Math.max(0, i - 1)]
  const p1 = WAYPOINTS[i]
  const p2 = WAYPOINTS[i + 1]
  const p3 = WAYPOINTS[Math.min(WAYPOINTS.length - 1, i + 2)]
  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
  }
}

function getTangent(progress: number): { dx: number; dy: number } {
  const { i, t } = progressToSegment(progress)
  const p0 = WAYPOINTS[Math.max(0, i - 1)]
  const p1 = WAYPOINTS[i]
  const p2 = WAYPOINTS[i + 1]
  const p3 = WAYPOINTS[Math.min(WAYPOINTS.length - 1, i + 2)]
  return {
    dx: catmullRomDerivative(p0.x, p1.x, p2.x, p3.x, t),
    dy: catmullRomDerivative(p0.y, p1.y, p2.y, p3.y, t),
  }
}

export function useWorldCamera(pathProgress: Ref<number>) {
  const cameraX = computed(() => getPoint(pathProgress.value).x)
  const cameraY = computed(() => getPoint(pathProgress.value).y)

  // Rotation: angle of path tangent relative to straight-down.
  // Whole world rotates so the tangent at camera position is always vertical.
  // Screens above/below appear tilted — they follow the road's curve.
  const rotation = computed(() => {
    const { dx, dy } = getTangent(pathProgress.value)
    return Math.atan2(dx, dy) * (180 / Math.PI)
  })

  // translate(50vw, 50vh)  — move world origin to viewport center
  // rotate(θ)              — align path tangent with viewport vertical
  // translate(-camX,-camY) — bring camera position to world origin
  const worldTransform = computed(() =>
    `translate(50vw, 50vh) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  )

  return { cameraX, cameraY, rotation, worldTransform, waypoints: WAYPOINTS }
}
