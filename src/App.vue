<script setup lang="ts">
import { computed } from 'vue'
import WorldContainer from './world/WorldContainer.vue'
import { WAYPOINTS, getTangentAngle, buildSvgPath, progressOf } from './composables/useWorldCamera'
import { useViewport } from './composables/useViewport'

const { vw, vh } = useViewport()

const stationW = computed(() => Math.round(Math.min(vw.value, Math.max(vw.value * 0.5, vh.value * vw.value / vh.value))))
const stationH = computed(() => Math.round(Math.min(vh.value, Math.max(vh.value * 0.5, vw.value * vh.value / vw.value))))

const STATIONS = [
  { label: 'HERO',             wpLabel: 'hero'     },
  { label: 'PORTRAIT GALLERY', wpLabel: 'portrait' },
  { label: 'PRODUCT GALLERY',  wpLabel: 'product'  },
  { label: 'WEB PROJECTS',     wpLabel: 'web'      },
  { label: '3D WORKS',         wpLabel: '3d'       },
  { label: 'CONTACTS',         wpLabel: 'contacts' },
]

const ABYSS_LABELS = ['abyss1', 'abyss2', 'abyss3-entry', 'abyss4', 'abyss5']

// Depth objects — each sits at its named waypoint on the path
const DEPTH_OBJECTS = [
  // Abyss 1
  { wpLabel: 'abyss1',      z: -2, color: 'var(--atmo-teal)',  size: 110, blur: 'var(--blur-deep)', scale: 0.6, zText: 'z −2' },
  // Abyss 3 detour objects — camera visits each one
  { wpLabel: 'abyss3-z-2',  z: -2, color: 'var(--atmo-sage)',  size: 110, blur: 'var(--blur-deep)', scale: 0.6, zText: 'z −2' },
  { wpLabel: 'abyss3-z-1',  z: -1, color: 'var(--atmo-coral)', size: 90,  blur: 'var(--blur-mid)',  scale: 0.8, zText: 'z −1' },
  { wpLabel: 'abyss3-z+1',  z:  1, color: 'var(--iris-mint)',  size: 80,  blur: '0px',              scale: 1.1, zText: 'z +1' },
  { wpLabel: 'abyss3-z+2',  z:  2, color: 'var(--iris-gold)',  size: 70,  blur: '0px',              scale: 1.3, zText: 'z +2' },
]

function wpByLabel(label: string) {
  return WAYPOINTS.find(w => w.label === label)!
}

function stationStyle(wpLabel: string) {
  const progress = progressOf(wpLabel)
  const angle = getTangentAngle(progress)
  const wp = wpByLabel(wpLabel)
  return {
    left:      `${wp.x}px`,
    top:       `${wp.y}px`,
    width:     `${stationW.value}px`,
    height:    `${stationH.value}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

function abyssStyle(wpLabel: string) {
  const progress = progressOf(wpLabel)
  const angle = getTangentAngle(progress)
  const wp = wpByLabel(wpLabel)
  return {
    left:      `${wp.x}px`,
    top:       `${wp.y}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

function depthStyle(obj: typeof DEPTH_OBJECTS[0]) {
  const progress = progressOf(obj.wpLabel)
  const angle = getTangentAngle(progress)
  const wp = wpByLabel(obj.wpLabel)
  return {
    left:       `${wp.x}px`,
    top:        `${wp.y}px`,
    width:      `${obj.size}px`,
    height:     `${obj.size}px`,
    background: obj.color,
    filter:     `blur(${obj.blur})`,
    transform:  `translate(-50%, -50%) scale(${obj.scale}) rotate(${-angle}deg)`,
    zIndex:     String(obj.z + 3),
  }
}

const svgPath = buildSvgPath()
</script>

<template>
  <WorldContainer>

    <div
      v-for="s in STATIONS" :key="s.label"
      class="station"
      :style="stationStyle(s.wpLabel)"
    >
      <span>{{ s.label }}</span>
      <small>{{ stationW }} × {{ stationH }}</small>
    </div>

    <div
      v-for="label in ABYSS_LABELS" :key="label"
      class="abyss-marker"
      :style="abyssStyle(label)"
    >
      {{ label.replace('-entry', '') }}
    </div>

    <div
      v-for="obj in DEPTH_OBJECTS" :key="obj.wpLabel"
      class="depth-obj"
      :style="depthStyle(obj)"
    >{{ obj.zText }}</div>

    <svg class="path-spine" viewBox="0 0 4000 14000" preserveAspectRatio="none">
      <path :d="svgPath" fill="none" stroke="rgba(201,149,108,0.2)" stroke-width="3" stroke-dasharray="16 10" />
      <circle v-for="(wp, i) in WAYPOINTS" :key="i"
        :cx="wp.x" :cy="wp.y" r="5"
        :fill="wp.label.startsWith('abyss3-z') ? '#6ee7b7' : (i % 2 === 0 ? '#c9956c' : '#a855f7')"
        opacity="0.5"
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
  color: rgba(201, 149, 108, 0.3);
}

.abyss-marker {
  position: absolute;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--col-glow);
  opacity: 0.45;
  text-transform: uppercase;
}

.depth-obj {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, monospace;
  font-size: 9px;
  color: rgba(255,255,255,0.6);
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
