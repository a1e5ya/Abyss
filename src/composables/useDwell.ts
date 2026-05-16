import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { ABYSS3_SPURS, spurJunction, cameraOverridePos, cursorWorldX, cursorWorldY } from './useWorldCamera'
import type { Spur } from './useWorldCamera'

const DWELL_RADIUS    = 300   // px — covers object pool + ribbon approach corridor
const LEAVE_RADIUS    = 420   // px — cursor must go this far before return triggers
const DWELL_SECONDS   = 0.5
const TRAVEL_SECONDS  = 1.2
const RETURN_SECONDS  = 1.8   // slow, dreamy comeback

export const dwellTarget   = ref<Spur | null>(null)
export const dwellProgress = ref(0)
export const dwellActive   = ref(false)

let countdownTween: gsap.core.Tween | null = null
let travelTween:   gsap.core.Tween | null = null

function startReturn() {
  if (!cameraOverridePos.value) return
  const from = { ...cameraOverridePos.value }
  const to   = dwellTarget.value ? spurJunction(dwellTarget.value) : from

  travelTween?.kill()
  travelTween = gsap.to(from, {
    x: to.x,
    y: to.y,
    duration: RETURN_SECONDS,
    ease: 'power1.inOut',
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

// Scroll engine calls this when user scrolls during an excursion
export function onScrollWhileExcursing() {
  if (!dwellActive.value || !cameraOverridePos.value) return
  startReturn()
}

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

// Distance from cursor world pos to a spur — checks both object center and
// nearest point along the ribbon centerline (junction → object segment).
function distToSpur(wx: number, wy: number, spur: Spur): number {
  const j  = spurJunction(spur)
  const ox = spur.object.x
  const oy = spur.object.y

  // Closest point on segment j→o
  const abx = ox - j.x
  const aby = oy - j.y
  const ab2 = abx * abx + aby * aby
  const t   = ab2 > 0 ? Math.max(0, Math.min(1, ((wx - j.x) * abx + (wy - j.y) * aby) / ab2)) : 0
  const cx  = j.x + t * abx
  const cy  = j.y + t * aby

  const dx = wx - cx
  const dy = wy - cy
  return Math.sqrt(dx * dx + dy * dy)
}

function nearestSpur(wx: number, wy: number): { spur: Spur; dist: number } | null {
  let best: { spur: Spur; dist: number } | null = null
  for (const spur of ABYSS3_SPURS) {
    const dist = distToSpur(wx, wy, spur)
    if (!best || dist < best.dist) best = { spur, dist }
  }
  return best
}

export function useDwell(cameraX: Ref<number>, cameraY: Ref<number>) {
  watch([cursorWorldX, cursorWorldY], ([wx, wy]) => {
    // While excursing: if cursor wanders far from the target object, return
    if (dwellActive.value) {
      if (!dwellTarget.value) return
      const dx = wx - dwellTarget.value.object.x
      const dy = wy - dwellTarget.value.object.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > LEAVE_RADIUS && !travelTween?.isActive()) startReturn()
      return
    }

    const nearest = nearestSpur(wx, wy)
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
