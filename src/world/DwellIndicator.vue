<script setup lang="ts">
import { computed } from 'vue'
import { dwellTarget, dwellProgress, dwellActive } from '../composables/useDwell'

const R    = 28
const CIRC = 2 * Math.PI * R

const strokeDash = computed(() => {
  const filled = CIRC * dwellProgress.value
  return `${filled} ${CIRC - filled}`
})

// Ring draws at the object, not the junction — that's where the cursor is
const ox    = computed(() => dwellTarget.value?.x ?? 0)
const oy    = computed(() => dwellTarget.value?.y ?? 0)
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
