import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { ABYSS3_SPURS, spurJunction, cameraOverridePos, cursorWorldX, cursorWorldY } from './useWorldCamera'
import { alignScrollToY } from './useScrollEngine'
import type { Spur } from './useWorldCamera'

// Renamed: "spur objects" are now highpoints
export type Highpoint = Spur

const ATTRACT_RADIUS = 600   // world-px — cursor within this range pulls camera
const ATTRACT_LERP   = 0.004 // per-frame pull strength — very slow dreamy float
const RETURN_LERP    = 0.003 // even slower drift back to spine
const DWELL_SECONDS  = 0.6   // seconds hovering before camera starts moving

export const highpointTarget   = ref<Highpoint | null>(null)
export const highpointProgress = ref(0)   // 0→1 dwell fill
export const highpointActive   = ref(false)

// dwellTarget / dwellProgress / dwellActive kept as aliases for DwellIndicator
export const dwellTarget   = highpointTarget
export const dwellProgress = highpointProgress
export const dwellActive   = highpointActive

let dwellTimer: ReturnType<typeof setTimeout> | null = null
let rafId: number | null = null
let returning = false
let progressFillStart = 0

// ── RAF loop — smooth lerp toward target or back to spine ─────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function tick() {
  const target = highpointTarget.value

  if (highpointActive.value && target) {
    // Drift toward highpoint
    const cur = cameraOverridePos.value ?? { x: 0, y: 0 }
    const nx  = lerp(cur.x, target.object.x, ATTRACT_LERP)
    const ny  = lerp(cur.y, target.object.y, ATTRACT_LERP)
    cameraOverridePos.value = { x: nx, y: ny }

    // Smoothly animate dwell progress fill proportional to proximity to target
    const elapsed = (Date.now() - progressFillStart) / (DWELL_SECONDS * 1000)
    highpointProgress.value = Math.min(elapsed, 1)

  } else if (returning && cameraOverridePos.value) {
    // Drift back toward spine junction of last target
    const junction = highpointTarget.value
      ? spurJunction(highpointTarget.value)
      : cameraOverridePos.value

    const cur = cameraOverridePos.value
    const nx  = lerp(cur.x, junction.x, RETURN_LERP)
    const ny  = lerp(cur.y, junction.y, RETURN_LERP)
    const dx  = Math.abs(nx - junction.x)
    const dy  = Math.abs(ny - junction.y)

    if (dx < 8 && dy < 8) {
      // Close enough — hand back to spine
      alignScrollToY(junction.y)
      cameraOverridePos.value  = null
      returning                = false
      highpointTarget.value    = null
      highpointProgress.value  = 0
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

// ── Return (scroll triggered) ─────────────────────────────────────────────────

export function startReturn() {
  if (returning) return
  returning             = true
  highpointActive.value = false
  clearDwellTimer()
  ensureRaf()
}

export function onScrollWhileExcursing() {
  if (highpointActive.value || returning) startReturn()
}

// ── Countdown / proximity ─────────────────────────────────────────────────────

function clearDwellTimer() {
  if (dwellTimer !== null) { clearTimeout(dwellTimer); dwellTimer = null }
}

function startDwell(hp: Highpoint, cameraX: Ref<number>, cameraY: Ref<number>) {
  if (highpointTarget.value?.label === hp.label) return
  clearDwellTimer()

  highpointTarget.value   = hp
  highpointProgress.value = 0
  progressFillStart       = Date.now()

  // Set override to current camera position so lerp starts from here
  cameraOverridePos.value = { x: cameraX.value, y: cameraY.value }

  dwellTimer = setTimeout(() => {
    highpointActive.value = true
    ensureRaf()
  }, DWELL_SECONDS * 1000)
}

function cancelDwell() {
  clearDwellTimer()
  if (!highpointActive.value && !returning) {
    cameraOverridePos.value  = null
    highpointTarget.value    = null
    highpointProgress.value  = 0
  }
}

function distToHighpoint(wx: number, wy: number, hp: Highpoint): number {
  const j   = spurJunction(hp)
  const ox  = hp.object.x
  const oy  = hp.object.y
  const abx = ox - j.x
  const aby = oy - j.y
  const ab2 = abx * abx + aby * aby
  const t   = ab2 > 0 ? Math.max(0, Math.min(1, ((wx - j.x) * abx + (wy - j.y) * aby) / ab2)) : 0
  const nx  = j.x + t * abx - wx
  const ny  = j.y + t * aby - wy
  return Math.sqrt(nx * nx + ny * ny)
}

function nearest(wx: number, wy: number): { hp: Highpoint; dist: number } | null {
  let best: { hp: Highpoint; dist: number } | null = null
  for (const hp of ABYSS3_SPURS) {
    const dist = distToHighpoint(wx, wy, hp)
    if (!best || dist < best.dist) best = { hp, dist }
  }
  return best
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useDwell(cameraX: Ref<number>, cameraY: Ref<number>) {
  watch([cursorWorldX, cursorWorldY], ([wx, wy]) => {
    if (returning) return

    const hit = nearest(wx, wy)

    if (highpointActive.value) {
      // Point-to-point: cursor near a different highpoint → redirect drift there directly
      if (hit && hit.dist < ATTRACT_RADIUS && hit.hp.label !== highpointTarget.value?.label) {
        highpointTarget.value   = hit.hp
        progressFillStart       = Date.now()
        highpointProgress.value = 0
        // cameraOverridePos stays where it is — lerp continues from current position
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
