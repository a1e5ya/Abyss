<script setup lang="ts">
import WorldContainer from './world/WorldContainer.vue'
import { getTangentAngle, WAYPOINTS } from './composables/useWorldCamera'

// Station waypoints are the even-indexed ones (0,2,4,6,8,10)
const STATIONS = [
  { label: 'HERO',             y: 0,     waypointIndex: 0 },
  { label: 'PORTRAIT GALLERY', y: 2800,  waypointIndex: 2 },
  { label: 'PRODUCT GALLERY',  y: 5600,  waypointIndex: 4 },
  { label: 'WEB PROJECTS',     y: 8400,  waypointIndex: 6 },
  { label: '3D WORKS',         y: 11200, waypointIndex: 8 },
  { label: 'CONTACTS',         y: 14000, waypointIndex: 10 },
]

const ABYSS = [
  { label: 'abyss 1', waypointIndex: 1 },
  { label: 'abyss 2', waypointIndex: 3 },
  { label: 'abyss 3', waypointIndex: 5 },
  { label: 'abyss 4', waypointIndex: 7 },
  { label: 'abyss 5', waypointIndex: 9 },
]

const totalSegments = WAYPOINTS.length - 1

// For each station: counter-rotate by the negative tangent angle at its waypoint.
// This makes the station sit flat on the path. The world rotation then tilts it
// naturally as it moves away from the camera position.
function stationStyle(waypointIndex: number) {
  const progress = waypointIndex / totalSegments
  const angle = getTangentAngle(progress)
  const wp = WAYPOINTS[waypointIndex]
  return {
    left: `${wp.x}px`,
    top:  `${wp.y}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

function abyssStyle(waypointIndex: number) {
  const progress = waypointIndex / totalSegments
  const angle = getTangentAngle(progress)
  const wp = WAYPOINTS[waypointIndex]
  return {
    left: `${wp.x}px`,
    top:  `${wp.y}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

// Build smooth SVG path from waypoints (Catmull-Rom → cubic bezier)
function buildSvgPath(pts: { x: number; y: number }[]): string {
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

const svgPath = buildSvgPath(WAYPOINTS)
</script>

<template>
  <WorldContainer>

    <!-- Station placeholder blocks -->
    <div
      v-for="s in STATIONS"
      :key="s.label"
      class="station"
      :style="stationStyle(s.waypointIndex)"
    >
      <span>{{ s.label }}</span>
      <small>y = {{ s.y }}</small>
    </div>

    <!-- Abyss markers -->
    <div
      v-for="a in ABYSS"
      :key="a.label"
      class="abyss-marker"
      :style="abyssStyle(a.waypointIndex)"
    >
      {{ a.label }}
    </div>

    <!-- Path spine -->
    <svg class="path-spine" viewBox="0 0 4000 14000" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <path
        :d="svgPath"
        fill="none"
        stroke="rgba(201,149,108,0.25)"
        stroke-width="3"
        stroke-dasharray="16 10"
      />
      <circle v-for="(wp, i) in WAYPOINTS" :key="i"
        :cx="wp.x" :cy="wp.y" r="10"
        :fill="i % 2 === 0 ? '#c9956c' : '#a855f7'"
        opacity="0.5"
      />
    </svg>

  </WorldContainer>
</template>

<style>
.station {
  position: absolute;
  width: 900px;
  height: 600px;
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

.abyss-marker {
  position: absolute;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--col-glow);
  opacity: 0.5;
  text-transform: uppercase;
}

.path-spine {
  position: absolute;
  top: 0;
  left: 0;
  width: 4000px;
  height: 14000px;
  pointer-events: none;
}
</style>
