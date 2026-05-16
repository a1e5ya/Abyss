import { computed } from 'vue'
import type { Ref } from 'vue'

// Cubic bezier path through the world.
// Four control points define the full journey top→bottom.
// x values curve ±400–800px left/right between stations.
// y values span the full world height (14000px).
const PATH = {
  p0: { x: 2000, y: 0 },
  p1: { x: 1200, y: 4667 },
  p2: { x: 2800, y: 9333 },
  p3: { x: 2000, y: 14000 },
}

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number) {
  const mt = 1 - t
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

function cubicBezierDerivative(p0: number, p1: number, p2: number, p3: number, t: number) {
  const mt = 1 - t
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2)
}

export function useWorldCamera(pathProgress: Ref<number>) {
  const cameraX = computed(() =>
    cubicBezier(PATH.p0.x, PATH.p1.x, PATH.p2.x, PATH.p3.x, pathProgress.value)
  )

  const cameraY = computed(() =>
    cubicBezier(PATH.p0.y, PATH.p1.y, PATH.p2.y, PATH.p3.y, pathProgress.value)
  )

  // Tangent direction → rotation angle in degrees
  // Clamped to ±8°. Stations hold ~2–3° (never fully 0).
  const rotation = computed(() => {
    const dx = cubicBezierDerivative(PATH.p0.x, PATH.p1.x, PATH.p2.x, PATH.p3.x, pathProgress.value)
    const dy = cubicBezierDerivative(PATH.p0.y, PATH.p1.y, PATH.p2.y, PATH.p3.y, pathProgress.value)
    const angle = Math.atan2(dx, dy) * (180 / Math.PI)
    return Math.max(-8, Math.min(8, angle))
  })

  // CSS transform applied to the world container
  const worldTransform = computed(() =>
    `translate(${-cameraX.value}px, ${-cameraY.value}px) rotate(${rotation.value}deg)`
  )

  return { cameraX, cameraY, rotation, worldTransform }
}
