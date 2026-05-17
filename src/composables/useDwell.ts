import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { ABYSS3_HIGHPOINTS, ABYSS3_CENTER, cameraOverridePos, cursorWorldX, cursorWorldY } from './useWorldCamera'
import { alignScrollToY } from './useScrollEngine'
import type { Highpoint } from './useWorldCamera'

const ATTRACT_RADIUS = 700   // world-px from highpoint center
const ATTRACT_LERP   = 0.004
const RETURN_LERP    = 0.003
const DWELL_SECONDS  = 0.5

export const highpointTarget   = ref<Highpoint | null>(null)
export const highpointProgress = ref(0)
export const highpointActive   = ref(false)

// Aliases for DwellIndicator
export const dwellTarget   = highpointTarget
export const dwellProgress = highpointProgress
export const dwellActive   = highpointActive

let dwellTimer: ReturnType<typeof setTimeout> | null = null
let rafId: number | null = null
let returning = false
let progressFillStart = 0

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function tick() {
  const target = highpointTarget.value

  if (highpointActive.value && target) {
    const cur = cameraOverridePos.value ?? { x: ABYSS3_CENTER.x, y: ABYSS3_CENTER.y }
    cameraOverridePos.value = {
      x: lerp(cur.x, target.x, ATTRACT_LERP),
      y: lerp(cur.y, target.y, ATTRACT_LERP),
    }
    const elapsed = (Date.now() - progressFillStart) / (DWELL_SECONDS * 1000)
    highpointProgress.value = Math.min(elapsed, 1)

  } else if (returning && cameraOverridePos.value) {
    const cur = cameraOverridePos.value
    const nx  = lerp(cur.x, ABYSS3_CENTER.x, RETURN_LERP)
    const ny  = lerp(cur.y, ABYSS3_CENTER.y, RETURN_LERP)

    if (Math.abs(nx - ABYSS3_CENTER.x) < 8 && Math.abs(ny - ABYSS3_CENTER.y) < 8) {
      alignScrollToY(ABYSS3_CENTER.y)
      cameraOverridePos.value = null
      returning               = false
      highpointTarget.value   = null
      highpointProgress.value = 0
    } else {
      cameraOverridePos.value = { x: nx, y: ny }
    }
  } else {
    rafId = null
    return
  }

  rafId = requestAnimationFrame(tick)
}

function ensureRaf() {
  if (rafId === null) rafId = requestAnimationFrame(tick)
}

export function startReturn() {
  if (returning) return
  returning             = true
  highpointActive.value = false
  clearDwellTimer()
  ensureRaf()
}

function releaseNow() {
  // Immediate release — user is scrolling, don't fight them.
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  returning               = false
  highpointActive.value   = false
  highpointTarget.value   = null
  highpointProgress.value = 0
  clearDwellTimer()
  cameraOverridePos.value = null
}

export function onScrollWhileExcursing() {
  if (highpointActive.value || returning) releaseNow()
}

function clearDwellTimer() {
  if (dwellTimer !== null) { clearTimeout(dwellTimer); dwellTimer = null }
}

function startDwell(hp: Highpoint, cameraX: Ref<number>, cameraY: Ref<number>) {
  if (highpointTarget.value?.label === hp.label) return
  clearDwellTimer()
  highpointTarget.value   = hp
  highpointProgress.value = 0
  progressFillStart       = Date.now()
  cameraOverridePos.value = { x: cameraX.value, y: cameraY.value }

  dwellTimer = setTimeout(() => {
    highpointActive.value = true
    ensureRaf()
  }, DWELL_SECONDS * 1000)
}

function cancelDwell() {
  clearDwellTimer()
  if (!highpointActive.value && !returning) {
    cameraOverridePos.value = null
    highpointTarget.value   = null
    highpointProgress.value = 0
  }
}

function nearest(wx: number, wy: number): { hp: Highpoint; dist: number } | null {
  let best: { hp: Highpoint; dist: number } | null = null
  for (const hp of ABYSS3_HIGHPOINTS) {
    const dx   = wx - hp.x
    const dy   = wy - hp.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!best || dist < best.dist) best = { hp, dist }
  }
  return best
}

export function useDwell(cameraX: Ref<number>, cameraY: Ref<number>) {
  watch([cursorWorldX, cursorWorldY], ([wx, wy]) => {
    if (returning) return

    const hit = nearest(wx, wy)

    if (highpointActive.value) {
      // Point-to-point: redirect to closer highpoint
      if (hit && hit.dist < ATTRACT_RADIUS && hit.hp.label !== highpointTarget.value?.label) {
        highpointTarget.value   = hit.hp
        progressFillStart       = Date.now()
        highpointProgress.value = 0
        ensureRaf()
      }
      return
    }

    if (!hit || hit.dist > ATTRACT_RADIUS) {
      cancelDwell()
      return
    }
    startDwell(hit.hp, cameraX, cameraY)
  })
}
