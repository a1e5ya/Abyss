import { ref, onMounted, onUnmounted } from 'vue'

const vw = ref(window.innerWidth)
const vh = ref(window.innerHeight)

// Singleton — one listener, shared across all consumers
let listeners = 0

function onResize() {
  vw.value = window.innerWidth
  vh.value = window.innerHeight
}

export function useViewport() {
  onMounted(() => {
    if (listeners === 0) window.addEventListener('resize', onResize)
    listeners++
  })
  onUnmounted(() => {
    listeners--
    if (listeners === 0) window.removeEventListener('resize', onResize)
  })
  return { vw, vh }
}
