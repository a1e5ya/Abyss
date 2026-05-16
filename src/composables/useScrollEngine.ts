import { ref, onMounted, onUnmounted } from 'vue'

const WORLD_HEIGHT = 14000
const LERP_FACTOR = 0.075

// Shared singleton state
const scrollY       = ref(0)
const smoothScrollY = ref(0)
const pathProgress  = ref(0)

// When overrideProgress is set, the camera ignores scroll and uses this value.
// Set to null to return control to scroll.
export const overrideProgress = ref<number | null>(null)

let rafId: number
let scrollContainer: HTMLElement | null = null
let instanceCount = 0

function onScroll() {
  scrollY.value = scrollContainer?.scrollTop ?? window.scrollY
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
