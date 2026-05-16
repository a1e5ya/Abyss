import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { evalWorldPoint, evalWorldTangent, tangentAngle, type BranchId } from './usePath'

export const activeBranch = ref<BranchId>('B') // default: center/drift

export function useWorldCamera(pathProgress: Ref<number>) {
  const cameraX = computed(() => evalWorldPoint(pathProgress.value, activeBranch.value).x)
  const cameraY = computed(() => evalWorldPoint(pathProgress.value, activeBranch.value).y)

  const rotation = computed(() => {
    const { x, y } = evalWorldTangent(pathProgress.value, activeBranch.value)
    return Math.atan2(x, y) * (180 / Math.PI)
  })

  const worldTransform = computed(() =>
    `translate(50vw, 50vh) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  )

  return { cameraX, cameraY, rotation, worldTransform }
}

// Exposed for station counter-rotation
export function getTangentAngle(progress: number): number {
  return tangentAngle(progress, activeBranch.value)
}
