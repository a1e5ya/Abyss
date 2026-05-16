import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { overrideProgress } from './useScrollEngine'
import { ABYSS3_SPURS, spurJunction, cameraOverridePos } from './useWorldCamera'
import type { Spur } from './useWorldCamera'

const DWELL_RADIUS   = 300
const DWELL_SECONDS  = 3
const TRAVEL_SECONDS = 1.2

export const dwellTarget   = ref<Spur | null>(null)
export const dwellProgress = ref(0)
export const dwellActive   = ref(false)

function nearestJunction(camX: number, camY: number) {
  let best: { spur: Spur; dist: number } | null = null
  for (const spur of ABYSS3_SPURS) {
    const j  = spurJunction(spur)
    const dx = camX - j.x
    const dy = camY - j.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!best || dist < best.dist) best = { spur, dist }
  }
  return best
}

export function useDwell(cameraX: Ref<number>, cameraY: Ref<number>) {
  let countdownTween: gsap.core.Tween | null = null

  function cancelDwell() {
    countdownTween?.kill(); countdownTween = null
    dwellTarget.value   = null
    dwellProgress.value = 0
  }

  function excurse(spur: Spur) {
    dwellActive.value = true
    countdownTween    = null

    const proxy = { x: cameraX.value, y: cameraY.value }

    gsap.to(proxy, {
      x: spur.object.x,
      y: spur.object.y,
      duration: TRAVEL_SECONDS,
      ease: 'power2.inOut',
      onUpdate() {
        cameraOverridePos.value = { x: proxy.x, y: proxy.y }
      },
      onComplete() {
        // Hold here. Any scroll in useScrollEngine clears cameraOverridePos,
        // which triggers the watcher below to reset dwell state.
      },
    })
  }

  // When scroll clears the override (user scrolled), reset dwell state
  watch(cameraOverridePos, (pos) => {
    if (pos === null && dwellActive.value) {
      dwellActive.value   = false
      dwellTarget.value   = null
      dwellProgress.value = 0
    }
  })

  // Proximity detection — only when not on an excursion
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
