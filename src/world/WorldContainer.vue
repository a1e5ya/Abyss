<script setup lang="ts">
import { useScrollEngine } from '../composables/useScrollEngine'
import { useWorldCamera } from '../composables/useWorldCamera'
import { useDwell } from '../composables/useDwell'
import DwellIndicator from './DwellIndicator.vue'

const { pathProgress, smoothScrollY } = useScrollEngine()
const { cameraX, cameraY, rotation, worldTransform } = useWorldCamera(pathProgress)

useDwell(cameraX, cameraY)
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
