<script setup lang="ts">
import { useScrollEngine } from '../composables/useScrollEngine'
import { useWorldCamera } from '../composables/useWorldCamera'

const { pathProgress, smoothScrollY } = useScrollEngine()
const { cameraX, cameraY, rotation, worldTransform } = useWorldCamera(pathProgress)
</script>

<template>
  <!-- Scroll driver: tall invisible div that generates scroll events -->
  <div id="scroll-driver" class="scroll-driver">
    <div class="scroll-spacer" />
  </div>

  <!-- Fixed viewport: the needle -->
  <div class="viewport">
    <!-- World fabric: moves beneath the needle -->
    <div class="world" :style="{ transform: worldTransform }">
      <slot />
    </div>
  </div>

  <!-- Debug overlay -->
  <div class="debug">
    <div>progress <span>{{ (pathProgress * 100).toFixed(1) }}%</span></div>
    <div>scroll Y <span>{{ smoothScrollY.toFixed(0) }}</span></div>
    <div>cam X <span>{{ cameraX.toFixed(0) }}</span></div>
    <div>cam Y <span>{{ cameraY.toFixed(0) }}</span></div>
    <div>rotation <span>{{ rotation.toFixed(2) }}°</span></div>
  </div>
</template>

<style scoped>
/* Scroll driver sits behind everything, fills viewport, scrolls */
.scroll-driver {
  position: fixed;
  inset: 0;
  overflow-y: scroll;
  z-index: 10;
  /* transparent so the world shows through */
  pointer-events: none;
}
/* Re-enable pointer events only for actual scrolling */
.scroll-driver {
  pointer-events: auto;
}

/* Spacer makes the scroll driver tall enough to drive the full world journey */
.scroll-spacer {
  height: 14000px;
  width: 1px;
  pointer-events: none;
}

/* Fixed viewport — the needle that never moves */
.viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* World — the fabric that moves */
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
