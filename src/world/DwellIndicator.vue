<script setup lang="ts">
import { computed } from 'vue'
import { dwellTarget, dwellProgress, dwellActive } from '../composables/useDwell'
import { highpointWorldPos } from '../composables/useWorldCamera'
import { useViewport } from '../composables/useViewport'

const R    = 28
const CIRC = 2 * Math.PI * R

const { vw, vh } = useViewport()

const strokeDash = computed(() => {
  const filled = CIRC * dwellProgress.value
  return `${filled} ${CIRC - filled}`
})

const pos = computed(() => {
  const hp = dwellTarget.value
  if (!hp) return { x: 0, y: 0 }
  const sw = Math.round(Math.min(vw.value, Math.max(vw.value * 0.5, vh.value * vw.value / vh.value)))
  return highpointWorldPos(hp, sw, vh.value)
})
const ox    = computed(() => pos.value.x)
const oy    = computed(() => pos.value.y)
const color = computed(() => dwellTarget.value?.color ?? 'white')
</script>

<template>
  <svg
    v-if="dwellTarget || dwellActive"
    class="dwell-svg"
    viewBox="0 0 4000 14000"
    preserveAspectRatio="none"
  >
    <!-- Background ring -->
    <circle
      :cx="ox" :cy="oy" :r="R"
      fill="none"
      stroke="rgba(255,255,255,0.08)"
      stroke-width="3"
    />
    <!-- Countdown arc -->
    <circle
      :cx="ox" :cy="oy" :r="R"
      fill="none"
      :stroke="color"
      stroke-width="3"
      stroke-linecap="round"
      :stroke-dasharray="strokeDash"
      stroke-dashoffset="0"
      :style="{ transformOrigin: `${ox}px ${oy}px`, transform: 'rotate(-90deg)' }"
    />
    <!-- Center dot -->
    <circle :cx="ox" :cy="oy" r="5" :fill="color" opacity="0.6" />
  </svg>
</template>

<style scoped>
.dwell-svg {
  position: absolute;
  top: 0; left: 0;
  width: 4000px;
  height: 14000px;
  pointer-events: none;
}
</style>
