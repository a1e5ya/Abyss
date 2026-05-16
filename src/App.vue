<script setup lang="ts">
import { computed } from 'vue'
import WorldContainer from './world/WorldContainer.vue'
import BranchFork from './world/BranchFork.vue'
import { getTangentAngle } from './composables/useWorldCamera'
import { MAIN_BEFORE, MAIN_AFTER, buildSvgPath } from './composables/usePath'
import { useViewport } from './composables/useViewport'

const { vw, vh } = useViewport()

// Station size: matches viewport aspect ratio, clamped between 50% and 100% of viewport
const stationW = computed(() => Math.round(Math.max(vw.value * 0.5, Math.min(vw.value, vh.value * (vw.value / vh.value)))))
const stationH = computed(() => Math.round(Math.max(vh.value * 0.5, Math.min(vh.value, vw.value * (vh.value / vw.value)))))

const WORLD_HEIGHT = 14000

const STATIONS = [
  { label: 'HERO',             y: 0,     progress: 0 / WORLD_HEIGHT },
  { label: 'PORTRAIT GALLERY', y: 2800,  progress: 2800 / WORLD_HEIGHT },
  { label: 'PRODUCT GALLERY',  y: 5600,  progress: 5600 / WORLD_HEIGHT },
  { label: 'WEB PROJECTS',     y: 8400,  progress: 8400 / WORLD_HEIGHT },
  { label: '3D WORKS',         y: 11200, progress: 11200 / WORLD_HEIGHT },
  { label: 'CONTACTS',         y: 14000, progress: 14000 / WORLD_HEIGHT },
]

// Main path x at each station (y=2000 for all stations on the spine)
const STATION_X = 2000

function stationStyle(progress: number) {
  const angle = getTangentAngle(progress)
  return {
    left:      `${STATION_X}px`,
    top:       `${progress * WORLD_HEIGHT}px`,
    width:     `${stationW.value}px`,
    height:    `${stationH.value}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

// Z-level test objects — placed in abyss zones at different depths
const DEPTH_OBJECTS = [
  // Abyss 1
  { x: 1400, y: 1100, label: 'z −2 deep',   z: -2, color: 'var(--atmo-teal)',  scale: 0.6, blur: 'var(--blur-deep)' },
  { x: 1600, y: 1400, label: 'z −1 mid',    z: -1, color: 'var(--atmo-rose)',  scale: 0.8, blur: 'var(--blur-mid)'  },
  { x: 1200, y: 1700, label: 'z +1 fore',   z: 1,  color: 'var(--col-glow)',   scale: 1.1, blur: '0px'             },
  { x: 1800, y: 1400, label: 'z +2 sphere', z: 2,  color: 'var(--col-gold)',   scale: 1.3, blur: '0px'             },
  // Abyss 3
  { x: 1200, y: 6700, label: 'z −2 deep',   z: -2, color: 'var(--atmo-sage)',  scale: 0.6, blur: 'var(--blur-deep)' },
  { x: 1400, y: 7000, label: 'z +1 fore',   z: 1,  color: 'var(--iris-mint)',  scale: 1.1, blur: '0px'             },
  { x: 1600, y: 7300, label: 'z +2 sphere', z: 2,  color: 'var(--iris-gold)',  scale: 1.3, blur: '0px'             },
]

// Combine main spine SVG (excluding fork zone)
const mainBeforeSvg = buildSvgPath(MAIN_BEFORE)
const mainAfterSvg  = buildSvgPath(MAIN_AFTER)
</script>

<template>
  <WorldContainer>

    <!-- ── Station placeholders ───────────────────────────────────────── -->
    <div
      v-for="s in STATIONS" :key="s.label"
      class="station"
      :style="stationStyle(s.progress)"
    >
      <span>{{ s.label }}</span>
      <small>{{ stationW }} × {{ stationH }}px</small>
    </div>

    <!-- ── Branch fork (abyss 2) ──────────────────────────────────────── -->
    <BranchFork />

    <!-- ── Z-level depth test objects ────────────────────────────────── -->
    <div
      v-for="(obj, i) in DEPTH_OBJECTS" :key="i"
      class="depth-obj"
      :style="{
        left:   `${obj.x}px`,
        top:    `${obj.y}px`,
        background: obj.color,
        transform: `translate(-50%, -50%) scale(${obj.scale})`,
        filter: `blur(${obj.blur})`,
        zIndex: obj.z + 3,
      }"
    >
      {{ obj.label }}
    </div>

    <!-- ── Path spine SVG ─────────────────────────────────────────────── -->
    <svg class="path-spine" viewBox="0 0 4000 14000" preserveAspectRatio="none">
      <!-- Before fork -->
      <path :d="mainBeforeSvg" fill="none" stroke="rgba(201,149,108,0.2)" stroke-width="3" stroke-dasharray="16 10" />
      <!-- After merge -->
      <path :d="mainAfterSvg"  fill="none" stroke="rgba(201,149,108,0.2)" stroke-width="3" stroke-dasharray="16 10" />
      <!-- Waypoint dots -->
      <circle v-for="(wp, i) in [...MAIN_BEFORE, ...MAIN_AFTER]" :key="i"
        :cx="wp.x" :cy="wp.y" r="8"
        :fill="i % 2 === 0 ? '#c9956c' : '#a855f7'"
        opacity="0.4"
      />
    </svg>

  </WorldContainer>
</template>

<style>
.station {
  position: absolute;
  border: 1px solid var(--col-gold);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(201, 149, 108, 0.04);
}

.station span {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.2em;
  color: var(--col-gold);
}

.station small {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: rgba(201, 149, 108, 0.4);
}

/* Depth test blobs */
.depth-obj {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.7);
  pointer-events: none;
}

.path-spine {
  position: absolute;
  top: 0; left: 0;
  width: 4000px;
  height: 14000px;
  pointer-events: none;
}
</style>
