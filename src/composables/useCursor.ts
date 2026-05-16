import { ref, onMounted, onUnmounted } from 'vue'

// Cursor position in viewport space (px from top-left)
export const cursorVx = ref(0)
export const cursorVy = ref(0)

// Cursor as normalized offset from viewport center: -1..+1
export const cursorNx = ref(0)
export const cursorNy = ref(0)

// Smoothed version (lerped each frame) for the viewport nudge
export const cursorSx = ref(0)
export const cursorSy = ref(0)

const NUDGE_STRENGTH = 80   // max world-space px the cursor can shift the camera
const LERP = 0.06

let rafId: number

function onMove(e: MouseEvent) {
  cursorVx.value = e.clientX
  cursorVy.value = e.clientY
  cursorNx.value = (e.clientX / window.innerWidth  - 0.5) * 2
  cursorNy.value = (e.clientY / window.innerHeight - 0.5) * 2
}

function tick() {
  cursorSx.value += (cursorNx.value - cursorSx.value) * LERP
  cursorSy.value += (cursorNy.value - cursorSy.value) * LERP
  rafId = requestAnimationFrame(tick)
}

let listeners = 0

export function useCursor() {
  onMounted(() => {
    if (listeners === 0) {
      window.addEventListener('mousemove', onMove, { passive: true })
      rafId = requestAnimationFrame(tick)
    }
    listeners++
  })
  onUnmounted(() => {
    listeners--
    if (listeners === 0) {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  })

  return { cursorVx, cursorVy, cursorNx, cursorNy, cursorSx, cursorSy, NUDGE_STRENGTH }
}
