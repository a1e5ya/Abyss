import { ref, onMounted, onUnmounted } from 'vue'
import { cursorVy } from './useCursor'
import { highpointActive, highpointTarget } from './useDwell'

const WORLD_HEIGHT   = 14000
const LERP_DEFAULT   = 0.075
const LERP_ABYSS3    = 0.025
const ABYSS3_START   = 0.42
const ABYSS3_END     = 0.58
const EXIT_BAND      = 0.20

const scrollY       = ref(0)
const smoothScrollY = ref(0)
const pathProgress  = ref(0)

// When set, tick() treats this as the scroll target for one handoff frame,
// then clears it. Lets finishReturn() align the spine without touching scrollTop.
let snapScrollY: number | null = null

export const overrideProgress = ref<number | null>(null)

let rafId: number
let scrollContainer: HTMLElement | null = null
let instanceCount   = 0
let lastScrollY     = -1

// Called by useDwell.finishReturn() to align spine position with where
// the return tween landed, without touching scrollTop (which fires onScroll).
export function alignScrollToY(worldY: number) {
  snapScrollY = Math.max(0, Math.min(WORLD_HEIGHT, worldY))
}

function inAbyss3() {
  const p = smoothScrollY.value / WORLD_HEIGHT
  return p >= ABYSS3_START && p <= ABYSS3_END
}

function cursorAtEdge(deltaY: number): boolean {
  const vy = cursorVy.value
  const h  = window.innerHeight
  if (deltaY < 0) return vy < h * EXIT_BAND
  if (deltaY > 0) return vy > h * (1 - EXIT_BAND)
  return false
}

function onWheel(e: WheelEvent) {
  // Lock scroll only when actively at a highpoint, not during plain passage.
  const locked = highpointActive.value || highpointTarget.value !== null
  if (inAbyss3() && locked && !cursorAtEdge(e.deltaY)) {
    e.preventDefault()
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
  // If finishReturn requested a scroll alignment, apply it now in the RAF
  // without touching scrollTop (avoids firing onScroll → onScrollWhileExcursing)
  if (snapScrollY !== null) {
    scrollY.value       = snapScrollY
    smoothScrollY.value = snapScrollY
    if (scrollContainer) {
      // Suppress the resulting scroll event by pre-setting lastScrollY
      lastScrollY = snapScrollY
      scrollContainer.scrollTop = snapScrollY
    }
    snapScrollY = null
  }

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
