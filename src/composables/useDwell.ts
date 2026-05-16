import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { overrideProgress } from './useScrollEngine'
import { ABYSS3_SPURS, cameraOverridePos } from './useWorldCamera'
import type { Spur } from './useWorldCamera'

const DWELL_RADIUS  = 300   // world-space px around junction
const DWELL_SECONDS = 3
const HOLD_SECONDS  = 1.5   // how long to pause at the object
const TRAVEL_SECONDS = 1.2  // camera glide time

export const dwellTarget   = ref<Spur | null>(null)
export const dwellProgress = ref(0)
export const dwellActive   = ref(false)

function nearestJunction(camX: number, camY: number) {
  let best: { spur: Spur; dist: number } | null = null
  for (const spur of ABYSS3_SPURS) {
    const dx = camX - spur.junction.x
    const dy = camY - spur.junction.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!best || dist < best.dist) best = { spur, dist }
  }
  return best
}

export function useDwell(cameraX: Ref<number>, cameraY: Ref<number>) {
  let countdownTween: gsap.core.Tween | null = null

  function cancelDwell() {
    countdownTween?.kill()
    countdownTween = null
    dwellTarget.value   = null
    dwellProgress.value = 0
  }

  function excurse(spur: Spur) {
    dwellActive.value = true
    countdownTween = null

    // Freeze scroll at current progress
    overrideProgress.value = overrideProgress.value ?? null

    // Capture junction as starting camera pos
    const startX = cameraX.value
    const startY = cameraY.value
    const proxy  = { x: startX, y: startY }

    // Travel to object
    gsap.to(proxy, {
      x: spur.object.x,
      y: spur.object.y,
      duration: TRAVEL_SECONDS,
      ease: 'power2.inOut',
      onUpdate() {
        cameraOverridePos.value = { x: proxy.x, y: proxy.y }
      },
      onComplete() {
        // Hold at object
        setTimeout(() => {
          // Travel back to junction
          const returnProxy = { x: proxy.x, y: proxy.y }
          gsap.to(returnProxy, {
            x: startX,
            y: startY,
            duration: TRAVEL_SECONDS,
            ease: 'power2.inOut',
            onUpdate() {
              cameraOverridePos.value = { x: returnProxy.x, y: returnProxy.y }
            },
            onComplete() {
              // Release control back to scroll
              cameraOverridePos.value = null
              overrideProgress.value  = null
              dwellActive.value       = false
              dwellTarget.value       = null
              dwellProgress.value     = 0
            },
          })
        }, HOLD_SECONDS * 1000)
      },
    })
  }

  watch([cameraX, cameraY], ([cx, cy]) => {
    if (dwellActive.value) return

    const nearest = nearestJunction(cx, cy)
    if (!nearest || nearest.dist > DWELL_RADIUS) {
      if (dwellTarget.value) cancelDwell()
      return
    }

    const { spur } = nearest

    if (dwellTarget.value?.label !== spur.label) {
      cancelDwell()
      dwellTarget.value   = spur
      dwellProgress.value = 0

      countdownTween = gsap.to(dwellProgress, {
        value: 1,
        duration: DWELL_SECONDS,
        ease: 'none',
        onComplete: () => excurse(spur),
      })
    }
  })
}
