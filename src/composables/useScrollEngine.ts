import { ref, onMounted, onUnmounted } from 'vue'
import { cameraOverridePos } from './useWorldCamera'

const WORLD_HEIGHT = 14000
const LERP_FACTOR  = 0.075

const scrollY       = ref(0)
const smoothScrollY = ref(0)
const pathProgress  = ref(0)

export const overrideProgress = ref<number | null>(null)

let rafId: number
let scrollContainer: HTMLElement | null = null
let instanceCount = 0
let lastScrollY = 0

function onScroll() {
  const newY = scrollContainer?.scrollTop ?? window.scrollY
  // Any scroll movement while an override is active releases it
  if (newY !== lastScrollY && cameraOverridePos.value !== null) {
    cameraOverridePos.value = null
    overrideProgress.value  = null
  }
  lastScrollY   = newY
  scrollY.value = newY
}

function tick() {
  if (overrideProgress.value === null) {
    smoothScrollY.value += (scrollY.value - smoothScrollY.value) * LERP_FACTOR
    pathProgress.value = Math.min(smoothScrollY.value / WORLD_HEIGHT, 1)
  } else {
    pathProgress.value = overrideProgress.value
  }
  rafId = requestAnimationFrame(tick)
}

export function useScrollEngine() {
  onMounted(() => {
    if (instanceCount === 0) {
      scrollContainer = document.getElementById('scroll-driver')
      scrollContainer?.addEventListener('scroll', onScroll, { passive: true })
      rafId = requestAnimationFrame(tick)
    }
    instanceCount++
  })

  onUnmounted(() => {
    instanceCount--
    if (instanceCount === 0) {
      scrollContainer?.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  })

  return { pathProgress, smoothScrollY, scrollY }
}
