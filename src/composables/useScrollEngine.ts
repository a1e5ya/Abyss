import { ref, onMounted, onUnmounted } from 'vue'
import { cursorVy } from './useCursor'

const WORLD_HEIGHT   = 14000
const LERP_DEFAULT   = 0.075
const LERP_ABYSS3    = 0.03
// Progress range where mouse takes control of navigation
const ABYSS3_START   = 0.42
const ABYSS3_END     = 0.58
// Fraction of viewport height at top/bottom that re-enables scroll to exit
const EXIT_BAND      = 0.20

const scrollY       = ref(0)
const smoothScrollY = ref(0)
const pathProgress  = ref(0)

export const overrideProgress = ref<number | null>(null)

let rafId: number
let scrollContainer: HTMLElement | null = null
let instanceCount   = 0
let lastScrollY     = -1

function inAbyss3() {
  const p = smoothScrollY.value / WORLD_HEIGHT
  return p >= ABYSS3_START && p <= ABYSS3_END
}

function cursorAtEdge(deltaY: number): boolean {
  const vy = cursorVy.value
  const h  = window.innerHeight
  if (deltaY < 0) return vy < h * EXIT_BAND          // scrolling up — cursor near top
  if (deltaY > 0) return vy > h * (1 - EXIT_BAND)    // scrolling down — cursor near bottom
  return false
}

function onWheel(e: WheelEvent) {
  if (inAbyss3() && !cursorAtEdge(e.deltaY)) {
    e.preventDefault()   // eat the scroll — mouse controls here
  }
}

function onScroll() {
  const newY = scrollContainer?.scrollTop ?? window.scrollY
  if (newY !== lastScrollY && lastScrollY >= 0) {
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
      // wheel must be non-passive so we can preventDefault in the zone
      scrollContainer?.addEventListener('wheel', onWheel, { passive: false })
      rafId = requestAnimationFrame(tick)
    }
    instanceCount++
  })

  onUnmounted(() => {
    instanceCount--
    if (instanceCount === 0) {
      scrollContainer?.removeEventListener('scroll', onScroll)
      scrollContainer?.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(rafId)
    }
  })

  return { pathProgress, smoothScrollY, scrollY }
}
