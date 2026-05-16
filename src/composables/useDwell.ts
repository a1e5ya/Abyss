import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { ABYSS3_SPURS, spurJunction, cameraOverridePos, cursorWorldX, cursorWorldY } from './useWorldCamera'
import { teleportScrollTo } from './useScrollEngine'
import type { Spur } from './useWorldCamera'

const DWELL_RADIUS   = 400   // px along ribbon centerline — wide approach zone
const LEAVE_RADIUS   = 500   // px from object center before cursor triggers return
const DWELL_SECONDS  = 0.5
const TRAVEL_SECONDS = 1.4
const RETURN_SECONDS = 2.2

export const dwellTarget   = ref<Spur | null>(null)
export const dwellProgress = ref(0)
export const dwellActive   = ref(false)

// State machine: idle → countdown → travelling → at-object → returning → idle
// Only one tween in flight at a time. returning flag blocks re-entry.
let countdownTween: gsap.core.Tween | null = null
let moveTween:      gsap.core.Tween | null = null
let returning = false

function finishReturn() {
  // Sync scroll to the junction's world-Y before releasing override,
  // so evalSpline(pathProgress) == cameraOverridePos exactly at handoff.
  if (dwellTarget.value) {
    teleportScrollTo(spurJunction(dwellTarget.value).y)
  }
  cameraOverridePos.value = null
  dwellActive.value       = false
  dwellTarget.value       = null
  dwellProgress.value     = 0
  returning               = false
}

function startReturn() {
  if (returning || !cameraOverridePos.value) return
  returning = true

  const from = { ...cameraOverridePos.value }
  const to   = dwellTarget.value ? spurJunction(dwellTarget.value) : from

  moveTween?.kill()
  moveTween = gsap.to(from, {
    x: to.x,
    y: to.y,
    duration: RETURN_SECONDS,
    ease: 'power1.inOut',
    onUpdate() {
      cameraOverridePos.value = { x: from.x, y: from.y }
    },
    onComplete: finishReturn,
  })
}

// Called by useScrollEngine on any scroll during excursion
export function onScrollWhileExcursing() {
  if (!dwellActive.value) return
  startReturn()
}

function cancelCountdown() {
  countdownTween?.kill()
  countdownTween      = null
  dwellTarget.value   = null
  dwellProgress.value = 0
}

function excurse(spur: Spur, cameraX: Ref<number>, cameraY: Ref<number>) {
  dwellActive.value = true
  countdownTween    = null

  const proxy = { x: cameraX.value, y: cameraY.value }
  moveTween?.kill()
  moveTween = gsap.to(proxy, {
    x: spur.object.x,
    y: spur.object.y,
    duration: TRAVEL_SECONDS,
    ease: 'power2.inOut',
    onUpdate() {
      cameraOverridePos.value = { x: proxy.x, y: proxy.y }
    },
  })
}

// Shortest distance from point to the line segment junction→object
function distToSpur(wx: number, wy: number, spur: Spur): number {
  const j   = spurJunction(spur)
  const ox  = spur.object.x
  const oy  = spur.object.y
  const abx = ox - j.x
  const aby = oy - j.y
  const ab2 = abx * abx + aby * aby
  const t   = ab2 > 0 ? Math.max(0, Math.min(1, ((wx - j.x) * abx + (wy - j.y) * aby) / ab2)) : 0
  const nx  = j.x + t * abx - wx
  const ny  = j.y + t * aby - wy
  return Math.sqrt(nx * nx + ny * ny)
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
    // During return: do nothing — let the tween finish undisturbed
    if (returning) return

    // At object: only watch for cursor leaving far enough
    if (dwellActive.value) {
      if (!dwellTarget.value) return
      const dx   = wx - dwellTarget.value.object.x
      const dy   = wy - dwellTarget.value.object.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      // Only trigger if travel is done (not mid-flight to object)
      if (dist > LEAVE_RADIUS && !moveTween?.isActive()) startReturn()
      return
    }

    // Idle: look for ribbon proximity
    const nearest = nearestSpur(wx, wy)
    if (!nearest || nearest.dist > DWELL_RADIUS) {
      if (dwellTarget.value) cancelCountdown()
      return
    }

    const { spur } = nearest
    if (dwellTarget.value?.label !== spur.label) {
      cancelCountdown()
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
