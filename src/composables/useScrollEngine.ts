import { ref, onMounted, onUnmounted } from 'vue'

const WORLD_HEIGHT   = 14000
const LERP_DEFAULT   = 0.075
const LERP_ABYSS3    = 0.03   // softer scroll feel through the Sankey section
const ABYSS3_START   = 0.42   // progress range that gets the soft lerp
const ABYSS3_END     = 0.58

const scrollY       = ref(0)
const smoothScrollY = ref(0)
const pathProgress  = ref(0)

export const overrideProgress = ref<number | null>(null)

let rafId: number
let scrollContainer: HTMLElement | null = null
let instanceCount   = 0
let lastScrollY     = -1

function onScroll() {
  const newY = scrollContainer?.scrollTop ?? window.scrollY
  if (newY !== lastScrollY && lastScrollY >= 0) {
    // Lazy import to avoid circular dep at module load time
    import('./useDwell').then(({ onScrollWhileExcursing }) => {
      onScrollWhileExcursing()
    })
  }
  lastScrollY   = newY
  scrollY.value = newY
}

function tick() {
  const p = smoothScrollY.value / WORLD_HEIGHT
  const lerp = (p >= ABYSS3_START && p <= ABYSS3_END) ? LERP_ABYSS3 : LERP_DEFAULT
  smoothScrollY.value += (scrollY.value - smoothScrollY.value) * lerp
  pathProgress.value = Math.min(smoothScrollY.value / WORLD_HEIGHT, 1)
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
