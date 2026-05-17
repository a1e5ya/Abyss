<script setup lang="ts">
import { computed } from 'vue'
import WorldContainer from './world/WorldContainer.vue'
import {
  WAYPOINTS, ABYSS3_HIGHPOINTS, ABYSS3_CENTER,
  getTangentAngle, buildSvgPath, progressOf,
} from './composables/useWorldCamera'
import { highpointTarget, highpointActive } from './composables/useDwell'
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

const ABYSS_LABELS = ['abyss1', 'abyss2', 'abyss3', 'abyss4', 'abyss5']

const ABYSS1_OBJECTS = [
  { x: 800,  y: 1100, z: -2, color: 'var(--atmo-teal)',  size: 110, blur: 'var(--blur-deep)', scale: 0.6, zText: 'z −2' },
  { x: 1000, y: 1350, z: -1, color: 'var(--atmo-rose)',  size: 90,  blur: 'var(--blur-mid)',  scale: 0.8, zText: 'z −1' },
  { x: 1600, y: 1500, z:  1, color: 'var(--col-glow)',   size: 80,  blur: '0px',              scale: 1.1, zText: 'z +1' },
  { x: 1700, y: 1200, z:  2, color: 'var(--col-gold)',   size: 70,  blur: '0px',              scale: 1.3, zText: 'z +2' },
]

// Abyss 3 center glow radius
const ABYSS3_GLOW_R = 600

const abyss3Wp = WAYPOINTS.find(w => w.label === 'abyss3')!

function abyss3StationStyle() {
  const progress = progressOf('abyss3')
  const angle    = getTangentAngle(progress)
  return {
    left:      `${abyss3Wp.x}px`,
    top:       `${abyss3Wp.y}px`,
    width:     `${stationW.value}px`,
    height:    `100dvh`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

function stationStyle(wpLabel: string) {
  const progress = progressOf(wpLabel)
  const angle = getTangentAngle(progress)
  const wp = WAYPOINTS.find(w => w.label === wpLabel)!
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
  const wp = WAYPOINTS.find(w => w.label === wpLabel)!
  return {
    left:      `${wp.x}px`,
    top:       `${wp.y}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

function abyss1ObjStyle(obj: typeof ABYSS1_OBJECTS[0]) {
  return {
    left:       `${obj.x}px`,
    top:        `${obj.y}px`,
    width:      `${obj.size}px`,
    height:     `${obj.size}px`,
    background: obj.color,
    filter:     `blur(${obj.blur})`,
    transform:  `translate(-50%, -50%) scale(${obj.scale})`,
  }
}

function highpointStyle(hp: typeof ABYSS3_HIGHPOINTS[0]) {
  const isActive  = highpointActive.value && highpointTarget.value?.label === hp.label
  const isPending = !highpointActive.value && highpointTarget.value?.label === hp.label
  const scale     = isActive ? 1.25 : isPending ? 1.08 : 1
  return {
    left:       `${hp.px * 100}%`,
    top:        `${hp.py * 100}%`,
    width:      `${hp.size}px`,
    height:     `${hp.size}px`,
    background: `radial-gradient(circle, ${hp.color} 0%, ${hp.color.replace(',1)', ',0)')} 100%)`,
    transform:  `translate(-50%, -50%) scale(${scale})`,
    boxShadow:  isActive ? `0 0 60px 20px ${hp.color.replace(',1)', ',0.35)')}` : 'none',
    transition: 'transform 1.5s ease, box-shadow 1.5s ease',
  }
}

const svgPath = buildSvgPath()
</script>

<template>
  <WorldContainer>

    <!-- Stations -->
    <div
      v-for="s in STATIONS" :key="s.label"
      class="station"
      :style="stationStyle(s.wpLabel)"
    >
      <span>{{ s.label }}</span>
      <small>{{ stationW }} × {{ stationH }}</small>
    </div>

    <!-- Abyss 3 station — 100dvh, highpoints float inside -->
    <div class="station abyss3-station" :style="abyss3StationStyle()">
      <span>ABYSS 3</span>
      <div
        v-for="hp in ABYSS3_HIGHPOINTS" :key="'hp-'+hp.label"
        class="highpoint"
        :style="highpointStyle(hp)"
      />
    </div>

    <!-- Abyss labels -->
    <div
      v-for="label in ABYSS_LABELS" :key="label"
      class="abyss-marker"
      :style="abyssStyle(label)"
    >{{ label }}</div>

    <!-- Abyss 1 depth objects -->
    <div
      v-for="obj in ABYSS1_OBJECTS" :key="'a1-'+obj.zText"
      class="depth-obj"
      :style="abyss1ObjStyle(obj)"
    />

    <!-- Path spine -->
    <svg class="path-spine" viewBox="0 0 4000 14000" preserveAspectRatio="none">

      <!-- Abyss 3 central atmospheric zone — radial gradient glow -->
      <defs>
        <radialGradient id="abyss3glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="rgba(180,140,255,0.18)" />
          <stop offset="55%"  stop-color="rgba(120,80,220,0.07)" />
          <stop offset="100%" stop-color="rgba(80,40,180,0)" />
        </radialGradient>
      </defs>
      <ellipse
        :cx="ABYSS3_CENTER.x" :cy="ABYSS3_CENTER.y"
        :rx="ABYSS3_GLOW_R" :ry="ABYSS3_GLOW_R * 0.75"
        fill="url(#abyss3glow)"
      />

      <!-- Main spine -->
      <path :d="svgPath" fill="none" stroke="rgba(201,149,108,0.25)" stroke-width="3" stroke-dasharray="16 10" />

      <!-- Spine waypoint dots -->
      <circle v-for="(wp, i) in WAYPOINTS" :key="i"
        :cx="wp.x" :cy="wp.y" r="6"
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
  pointer-events: none;
}
.abyss3-station {
  overflow: visible;
}
.highpoint {
  position: absolute;
  border-radius: 50%;
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
