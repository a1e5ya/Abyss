import { ref, onMounted, onUnmounted } from 'vue'

const WORLD_HEIGHT = 14000
const LERP_FACTOR = 0.075

export function useScrollEngine() {
  const scrollY = ref(0)
  const smoothScrollY = ref(0)
  const pathProgress = ref(0)

  let rafId: number
  let scrollContainer: HTMLElement | null = null

  function onScroll() {
    scrollY.value = scrollContainer?.scrollTop ?? window.scrollY
  }

  function tick() {
    smoothScrollY.value += (scrollY.value - smoothScrollY.value) * LERP_FACTOR
    pathProgress.value = Math.min(smoothScrollY.value / WORLD_HEIGHT, 1)
    rafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    // The scroll container is a tall div inside the fixed viewport
    scrollContainer = document.getElementById('scroll-driver')
    scrollContainer?.addEventListener('scroll', onScroll, { passive: true })
    rafId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    scrollContainer?.removeEventListener('scroll', onScroll)
    cancelAnimationFrame(rafId)
  })

  return { pathProgress, smoothScrollY, scrollY }
}
