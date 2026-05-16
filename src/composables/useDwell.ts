import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { ABYSS3_SPURS, spurJunction, cameraOverridePos, cursorWorldX, cursorWorldY } from './useWorldCamera'
import { alignScrollToY } from './useScrollEngine'
import type { Spur } from './useWorldCamera'

const DWELL_RADIUS   = 500   // px along ribbon centerline — wide approach zone
const DWELL_SECONDS  = 0.5
const TRAVEL_SECONDS = 1.6
const RETURN_SECONDS = 2.0

export const dwellTarget   = ref<Spur | null>(null)
export const dwellProgress = ref(0)
export const dwellActive   = ref(false)

let countdownTween: gsap.core.Tween | null = null
let moveTween:      gsap.core.Tween | null = null
let returning = false

// ── Return ────────────────────────────────────────────────────────────────────

function finishReturn() {
  // Align scroll to junction Y in the next RAF tick (safe — no scrollTop side-effects now)
  if (dwellTarget.value) alignScrollToY(spurJunction(dwellTarget.value).y)
  cameraOverridePos.value = null
  dwellActive.value       = false
  dwellTarget.value       = null
  dwellProgress.value     = 0
  returning               = false
}

export function startReturn() {
  if (returning || !cameraOverridePos.value) return
  returning = true
  moveTween?.kill()

  const from = { ...cameraOverridePos.value }
  const to   = dwellTarget.value ? spurJunction(dwellTarget.value) : from

  moveTween = gsap.to(from, {
    x: to.x,
    y: to.y,
    duration: RETURN_SECONDS,
    ease: 'power1.inOut',
    onUpdate() { cameraOverridePos.value = { x: from.x, y: from.y } },
    onComplete: finishReturn,
  })
}

// Called by useScrollEngine when scroll happens while active
export function onScrollWhileExcursing() {
  if (dwellActive.value) startReturn()
}

// ── Countdown / travel ────────────────────────────────────────────────────────

function cancelCountdown() {
  countdownTween?.kill()
  countdownTween      = null
  dwellTarget.value   = null
  dwellProgress.value = 0
}

function excurse(spur: Spur, cameraX: Ref<number>, cameraY: Ref<number>) {
  dwellActive.value = true
  countdownTween    = null
  returning         = false

  const proxy = { x: cameraX.value, y: cameraY.value }
  moveTween?.kill()
  moveTween = gsap.to(proxy, {
    x: spur.object.x,
    y: spur.object.y,
    duration: TRAVEL_SECONDS,
    ease: 'power2.inOut',
    onUpdate() { cameraOverridePos.value = { x: proxy.x, y: proxy.y } },
  })
}

// ── Proximity ─────────────────────────────────────────────────────────────────

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

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useDwell(cameraX: Ref<number>, cameraY: Ref<number>) {
  watch([cursorWorldX, cursorWorldY], ([wx, wy]) => {
    // While returning: completely hands-off — tween runs to completion
    if (returning) return

    // While at object: no cursor-triggered return — only scroll triggers it.
    // This prevents the camera shake caused by cursorWorld shifting as the
    // camera moves and re-triggering the leave check.
    if (dwellActive.value) return

    // Idle: check ribbon proximity for countdown
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
