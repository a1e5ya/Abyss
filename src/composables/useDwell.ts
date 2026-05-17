import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { ABYSS3_HIGHPOINTS, ABYSS3_CENTER, highpointWorldPos, cursorWorldX, cursorWorldY, highpointNudgeX, highpointNudgeY } from './useWorldCamera'
import { useViewport } from './useViewport'
import type { Highpoint } from './useWorldCamera'

// How far from a highpoint the cursor starts pulling (world px)
const ATTRACT_RADIUS = 800
// Per-frame lerp toward highpoint offset — very gentle
const PULL_LERP      = 0.003
// Per-frame lerp back to zero when no target
const RELEASE_LERP   = 0.002
// Max pull distance in world px
const MAX_PULL       = 180

export const highpointTarget   = ref<Highpoint | null>(null)
export const highpointProgress = ref(0)
export const highpointActive   = ref(false)

// DwellIndicator aliases
export const dwellTarget   = highpointTarget
export const dwellProgress = highpointProgress
export const dwellActive   = highpointActive

// No longer used — kept so useScrollEngine import doesn't break
export function onScrollWhileExcursing() {}
export function startReturn() {}

let rafId: number | null = null

const { vw, vh } = useViewport()

// Station width matches stationW formula in App.vue
function stationW() { return Math.round(Math.min(vw.value, Math.max(vw.value * 0.5, vh.value * vw.value / vh.value))) }
function stationH() { return vh.value }  // 100dvh

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, max: number) { return Math.max(-max, Math.min(max, v)) }

function tick() {
  const target = highpointTarget.value

  if (target) {
    const wp = highpointWorldPos(target, stationW(), stationH())
    const targetNudgeX = clamp(wp.x - ABYSS3_CENTER.x, MAX_PULL)
    const targetNudgeY = clamp(wp.y - ABYSS3_CENTER.y, MAX_PULL)
    highpointNudgeX.value = lerp(highpointNudgeX.value, targetNudgeX, PULL_LERP)
    highpointNudgeY.value = lerp(highpointNudgeY.value, targetNudgeY, PULL_LERP)
  } else {
    // Drift back to zero
    highpointNudgeX.value = lerp(highpointNudgeX.value, 0, RELEASE_LERP)
    highpointNudgeY.value = lerp(highpointNudgeY.value, 0, RELEASE_LERP)
  }

  const settled = Math.abs(highpointNudgeX.value) < 0.5 && Math.abs(highpointNudgeY.value) < 0.5
  if (!target && settled) {
    highpointNudgeX.value = 0
    highpointNudgeY.value = 0
    rafId = null
    return
  }

  rafId = requestAnimationFrame(tick)
}

function ensureRaf() {
  if (rafId === null) rafId = requestAnimationFrame(tick)
}

function nearest(wx: number, wy: number): { hp: Highpoint; dist: number } | null {
  let best: { hp: Highpoint; dist: number } | null = null
  const sw = stationW()
  const sh = stationH()
  for (const hp of ABYSS3_HIGHPOINTS) {
    const wp   = highpointWorldPos(hp, sw, sh)
    const dx   = wx - wp.x
    const dy   = wy - wp.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!best || dist < best.dist) best = { hp, dist }
  }
  return best
}

export function useDwell(_cameraX: Ref<number>, _cameraY: Ref<number>) {
  watch([cursorWorldX, cursorWorldY], ([wx, wy]) => {
    const hit = nearest(wx, wy)

    if (!hit || hit.dist > ATTRACT_RADIUS) {
      if (highpointTarget.value) {
        highpointTarget.value   = null
        highpointActive.value   = false
        highpointProgress.value = 0
        ensureRaf()
      }
      return
    }

    if (highpointTarget.value?.label !== hit.hp.label) {
      highpointTarget.value   = hit.hp
      highpointActive.value   = true
      highpointProgress.value = 1
      ensureRaf()
    }
  })
}
