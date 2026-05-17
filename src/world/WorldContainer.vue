<script setup lang="ts">
import { watch } from 'vue'
import { useScrollEngine } from '../composables/useScrollEngine'
import { useWorldCamera, cursorNudgeX, cursorNudgeY, cursorWorldX, cursorWorldY, cameraOverridePos, evalSpline } from '../composables/useWorldCamera'
import { useCursor } from '../composables/useCursor'
import { useDwell } from '../composables/useDwell'
import DwellIndicator from './DwellIndicator.vue'

const { pathProgress } = useScrollEngine()
const { cameraX, cameraY, rotation, worldTransform } = useWorldCamera(pathProgress)
const { cursorSx, cursorSy, cursorVx, cursorVy, NUDGE_STRENGTH } = useCursor()

useDwell(cameraX, cameraY)

// Drive cursor nudge into world transform
watch([cursorSx, cursorSy], ([sx, sy]) => {
  cursorNudgeX.value = sx * NUDGE_STRENGTH
  cursorNudgeY.value = sy * NUDGE_STRENGTH
})

// Convert viewport cursor position to world-space position
// so useDwell can detect proximity to objects regardless of camera position
watch([cursorVx, cursorVy], ([vx, vy]) => {
  // Camera position in world space
  const cx = cameraOverridePos.value?.x ?? evalSpline(pathProgress.value).x
  const cy = cameraOverridePos.value?.y ?? evalSpline(pathProgress.value).y
  // Viewport cursor offset from center (in screen px), un-rotated into world space
  const dx = vx - window.innerWidth  / 2
  const dy = vy - window.innerHeight / 2
  const rad = -rotation.value * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  cursorWorldX.value = cx + (dx * cos - dy * sin)
  cursorWorldY.value = cy + (dx * sin + dy * cos)
})
</script>

<template>
  <div id="scroll-driver" class="scroll-driver">
    <div class="scroll-spacer" />
  </div>

  <div class="viewport">
    <div class="world" :style="{ transform: worldTransform }">
      <slot />
      <DwellIndicator />
    </div>
  </div>

  <div class="debug">
    <div>progress <span>{{ (pathProgress * 100).toFixed(1) }}%</span></div>
    <div>cam X <span>{{ cameraX.toFixed(0) }}</span></div>
    <div>cam Y <span>{{ cameraY.toFixed(0) }}</span></div>
    <div>rotation <span>{{ rotation.toFixed(2) }}°</span></div>
    <div>cursor world <span>{{ cursorWorldX.toFixed(0) }}, {{ cursorWorldY.toFixed(0) }}</span></div>
  </div>
</template>

<style scoped>
.scroll-driver {
  position: fixed;
  inset: 0;
  overflow-y: scroll;
  z-index: 10;
  pointer-events: auto;
}

.scroll-spacer {
  height: 14000px;
  width: 1px;
  pointer-events: none;
}

.viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.world {
  position: absolute;
  top: 0;
  left: 0;
  width: 4000px;
  transform-origin: 0 0;
  will-change: transform;
}

.debug {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 100;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: v-bind("'var(--col-chem-green)'");
  background: rgba(13, 17, 23, 0.85);
  border: 1px solid var(--col-charcoal);
  padding: 10px 14px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}

.debug span {
  color: var(--iris-gold);
  margin-left: 8px;
}
</style>
