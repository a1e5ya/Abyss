<script setup lang="ts">
import { computed } from 'vue'
import { dwellTarget, dwellProgress, dwellActive } from '../composables/useDwell'
import { spurJunction } from '../composables/useWorldCamera'

const R    = 22
const CIRC = 2 * Math.PI * R

const strokeDash = computed(() => {
  const filled = CIRC * dwellProgress.value
  return `${filled} ${CIRC - filled}`
})

const junctionX = computed(() => dwellTarget.value ? spurJunction(dwellTarget.value).x : 0)
const junctionY = computed(() => dwellTarget.value ? spurJunction(dwellTarget.value).y : 0)
const color      = computed(() => dwellTarget.value?.color ?? 'white')
</script>

<template>
  <svg
    v-if="dwellTarget && !dwellActive"
    class="dwell-svg"
    viewBox="0 0 4000 14000"
    preserveAspectRatio="none"
  >
    <!-- Background ring -->
    <circle
      :cx="junctionX" :cy="junctionY" :r="R"
      fill="none"
      stroke="rgba(255,255,255,0.1)"
      stroke-width="3"
    />
    <!-- Countdown arc -->
    <circle
      :cx="junctionX" :cy="junctionY" :r="R"
      fill="none"
      :stroke="color"
      stroke-width="3"
      stroke-linecap="round"
      :stroke-dasharray="strokeDash"
      stroke-dashoffset="0"
      transform-origin="center"
      style="transform: rotate(-90deg); transition: stroke-dasharray 0.05s linear;"
    />
    <!-- Center dot -->
    <circle :cx="junctionX" :cy="junctionY" r="4" :fill="color" opacity="0.8" />
  </svg>

  <!-- Locked indicator while on excursion -->
  <svg
    v-if="dwellActive"
    class="dwell-svg"
    viewBox="0 0 4000 14000"
    preserveAspectRatio="none"
  >
    <circle
      :cx="junctionX" :cy="junctionY" :r="R"
      fill="none"
      :stroke="color"
      stroke-width="2"
      opacity="0.5"
      stroke-dasharray="4 4"
    />
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
