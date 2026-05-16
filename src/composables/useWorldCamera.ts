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

  // Tangent angle: how much the path is turning at this point.
  // atan2(dx, dy) gives the angle of the tangent relative to straight-down (the drone's forward).
  // No clamp — full rotation so the tangent is always aligned with the viewport's vertical axis.
  const rotation = computed(() => {
    const dx = cubicBezierDerivative(PATH.p0.x, PATH.p1.x, PATH.p2.x, PATH.p3.x, pathProgress.value)
    const dy = cubicBezierDerivative(PATH.p0.y, PATH.p1.y, PATH.p2.y, PATH.p3.y, pathProgress.value)
    return Math.atan2(dx, dy) * (180 / Math.PI)
  })

  // Three-step transform — order matters:
  // 1. translate(-cameraX, -cameraY): bring camera point to world origin
  // 2. rotate(θ): rotate world so the path tangent points straight up
  // 3. translate(50vw, 50vh): move world origin to viewport center
  // CSS applies right-to-left, so we write it left-to-right as:
  // translate(50vw, 50vh) rotate(θ) translate(-cameraX, -cameraY)
  const worldTransform = computed(() =>
    `translate(50vw, 50vh) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  )

  return { cameraX, cameraY, rotation, worldTransform }
}
