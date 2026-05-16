import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { ABYSS3_SPURS, spurJunction, cameraOverridePos, cursorWorldX, cursorWorldY } from './useWorldCamera'
import type { Spur } from './useWorldCamera'

const DWELL_RADIUS   = 200
const DWELL_SECONDS  = 3
const TRAVEL_SECONDS = 1.0
const RETURN_SECONDS = 0.9

export const dwellTarget   = ref<Spur | null>(null)
export const dwellProgress = ref(0)
export const dwellActive   = ref(false)

// Scroll engine calls this when user scrolls during an excursion
export function onScrollWhileExcursing() {
  if (!dwellActive.value || !cameraOverridePos.value) return
  const from = { ...cameraOverridePos.value }
  const to   = dwellTarget.value ? spurJunction(dwellTarget.value) : from

  travelTween?.kill()
  travelTween = gsap.to(from, {
    x: to.x,
    y: to.y,
    duration: RETURN_SECONDS,
    ease: 'power2.inOut',
    onUpdate() {
      cameraOverridePos.value = { x: from.x, y: from.y }
    },
    onComplete() {
      cameraOverridePos.value = null
      dwellActive.value       = false
      dwellTarget.value       = null
      dwellProgress.value     = 0
    },
  })
}

let countdownTween: gsap.core.Tween | null = null
let travelTween:   gsap.core.Tween | null = null

function cancelDwell() {
  countdownTween?.kill(); countdownTween = null
  dwellTarget.value   = null
  dwellProgress.value = 0
}

function excurse(spur: Spur, cameraX: Ref<number>, cameraY: Ref<number>) {
  dwellActive.value = true
  countdownTween    = null

  const proxy = { x: cameraX.value, y: cameraY.value }
  travelTween?.kill()
  travelTween = gsap.to(proxy, {
    x: spur.object.x,
    y: spur.object.y,
    duration: TRAVEL_SECONDS,
    ease: 'power2.inOut',
    onUpdate() {
      cameraOverridePos.value = { x: proxy.x, y: proxy.y }
    },
  })
}

function nearestObject(wx: number, wy: number) {
  let best: { spur: Spur; dist: number } | null = null
  for (const spur of ABYSS3_SPURS) {
    const dx   = wx - spur.object.x
    const dy   = wy - spur.object.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!best || dist < best.dist) best = { spur, dist }
  }
  return best
}

export function useDwell(cameraX: Ref<number>, cameraY: Ref<number>) {
  // Cursor proximity drives dwell countdown
  watch([cursorWorldX, cursorWorldY], ([wx, wy]) => {
    if (dwellActive.value) return

    const nearest = nearestObject(wx, wy)
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
        onComplete: () => excurse(spur, cameraX, cameraY),
      })
    }
  })
}
