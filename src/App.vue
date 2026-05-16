<script setup lang="ts">
import { computed } from 'vue'
import WorldContainer from './world/WorldContainer.vue'
import { WAYPOINTS, getTangentAngle, buildSvgPath } from './composables/useWorldCamera'
import { useViewport } from './composables/useViewport'

const { vw, vh } = useViewport()

const WORLD_HEIGHT = 14000

// Station size: viewport aspect ratio, clamped 50–100% of viewport
const stationW = computed(() => Math.round(Math.min(vw.value, Math.max(vw.value * 0.5, vh.value * vw.value / vh.value))))
const stationH = computed(() => Math.round(Math.min(vh.value, Math.max(vh.value * 0.5, vw.value * vh.value / vw.value))))

// Stations sit on even-indexed waypoints
const STATIONS = [
  { label: 'HERO',             waypointIndex: 0  },
  { label: 'PORTRAIT GALLERY', waypointIndex: 2  },
  { label: 'PRODUCT GALLERY',  waypointIndex: 4  },
  { label: 'WEB PROJECTS',     waypointIndex: 6  },
  { label: '3D WORKS',         waypointIndex: 8  },
  { label: 'CONTACTS',         waypointIndex: 10 },
]

// Abyss markers sit on odd-indexed waypoints
const ABYSSES = [
  { label: 'abyss 1', waypointIndex: 1 },
  { label: 'abyss 2', waypointIndex: 3 },
  { label: 'abyss 3', waypointIndex: 5 },
  { label: 'abyss 4', waypointIndex: 7 },
  { label: 'abyss 5', waypointIndex: 9 },
]

// Z-level depth test objects — scattered across abyss zones
// z: -2=deep(0.15), -1=mid(0.45), +1=fore(1.55), +2=sphere(2.1)
const DEPTH_OBJECTS = [
  // Abyss 1 (wp 1: x=1200, y=1400)
  { x: 900,  y: 1150, z: -2, label: 'z −2', color: 'var(--atmo-teal)',  size: 110, blur: 'var(--blur-deep)', scale: 0.6 },
  { x: 1100, y: 1350, z: -1, label: 'z −1', color: 'var(--atmo-rose)',  size: 90,  blur: 'var(--blur-mid)',  scale: 0.8 },
  { x: 1300, y: 1550, z:  1, label: 'z +1', color: 'var(--col-glow)',   size: 80,  blur: '0px',             scale: 1.1 },
  { x: 1500, y: 1300, z:  2, label: 'z +2', color: 'var(--col-gold)',   size: 70,  blur: '0px',             scale: 1.3 },
  // Abyss 3 (wp 5: x=1200, y=7000)
  { x: 900,  y: 6750, z: -2, label: 'z −2', color: 'var(--atmo-sage)',  size: 110, blur: 'var(--blur-deep)', scale: 0.6 },
  { x: 1400, y: 7100, z: -1, label: 'z −1', color: 'var(--atmo-coral)', size: 90,  blur: 'var(--blur-mid)',  scale: 0.8 },
  { x: 1100, y: 7300, z:  1, label: 'z +1', color: 'var(--iris-mint)',  size: 80,  blur: '0px',             scale: 1.1 },
  { x: 1500, y: 6900, z:  2, label: 'z +2', color: 'var(--iris-gold)',  size: 70,  blur: '0px',             scale: 1.3 },
]

function depthStyle(obj: typeof DEPTH_OBJECTS[0]) {
  return {
    left:      `${obj.x}px`,
    top:       `${obj.y}px`,
    width:     `${obj.size}px`,
    height:    `${obj.size}px`,
    background: obj.color,
    filter:    `blur(${obj.blur})`,
    transform: `translate(-50%, -50%) scale(${obj.scale})`,
    zIndex:    String(obj.z + 3),
  }
}

function objectStyle(waypointIndex: number, w: number, h: number) {
  const progress = (WAYPOINTS[waypointIndex].y) / WORLD_HEIGHT
  const angle = getTangentAngle(progress)
  const wp = WAYPOINTS[waypointIndex]
  return {
    left:      `${wp.x}px`,
    top:       `${wp.y}px`,
    width:     `${w}px`,
    height:    `${h}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

const svgPath = buildSvgPath()
</script>

<template>
  <WorldContainer>

    <div
      v-for="s in STATIONS" :key="s.label"
      class="station"
      :style="objectStyle(s.waypointIndex, stationW, stationH)"
    >
      <span>{{ s.label }}</span>
      <small>{{ stationW }} × {{ stationH }}</small>
    </div>

    <div
      v-for="a in ABYSSES" :key="a.label"
      class="abyss-marker"
      :style="objectStyle(a.waypointIndex, 160, 40)"
    >
      {{ a.label }}
    </div>

    <!-- Z-level depth test blobs -->
    <div
      v-for="(obj, i) in DEPTH_OBJECTS" :key="'d'+i"
      class="depth-obj"
      :style="depthStyle(obj)"
    >{{ obj.label }}</div>

    <svg class="path-spine" viewBox="0 0 4000 14000" preserveAspectRatio="none">
      <path :d="svgPath" fill="none" stroke="rgba(201,149,108,0.2)" stroke-width="3" stroke-dasharray="16 10" />
      <circle v-for="(wp, i) in WAYPOINTS" :key="i"
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
  color: rgba(201, 149, 108, 0.3);
}

.abyss-marker {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
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
