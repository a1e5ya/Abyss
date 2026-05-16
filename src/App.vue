<script setup lang="ts">
import WorldContainer from './world/WorldContainer.vue'

// Waypoints mirrored here just for the SVG path — keep in sync with useWorldCamera
const WAYPOINTS = [
  { x: 2000, y: 0 },
  { x: 1200, y: 1400 },
  { x: 2000, y: 2800 },
  { x: 2800, y: 4200 },
  { x: 2000, y: 5600 },
  { x: 1200, y: 7000 },
  { x: 2000, y: 8400 },
  { x: 2800, y: 9800 },
  { x: 2000, y: 11200 },
  { x: 1200, y: 12600 },
  { x: 2000, y: 14000 },
]

// Build a smooth SVG path string from the waypoints using cubic bezier segments
// that approximate the Catmull-Rom spline visually
function buildSvgPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    // Catmull-Rom to cubic bezier control points
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

    <!-- Station placeholder blocks — centered on their path waypoint x -->
    <div class="station" style="top: 0px;     left: 2000px;"><span>HERO</span><small>y = 0</small></div>
    <div class="station" style="top: 2800px;  left: 2000px;"><span>PORTRAIT GALLERY</span><small>y = 2800</small></div>
    <div class="station" style="top: 5600px;  left: 2000px;"><span>PRODUCT GALLERY</span><small>y = 5600</small></div>
    <div class="station" style="top: 8400px;  left: 2000px;"><span>WEB PROJECTS</span><small>y = 8400</small></div>
    <div class="station" style="top: 11200px; left: 2000px;"><span>3D WORKS</span><small>y = 11200</small></div>
    <div class="station" style="top: 14000px; left: 2000px;"><span>CONTACTS</span><small>y = 14000</small></div>

    <!-- Abyss markers — placed at their waypoint x -->
    <div class="abyss-marker" style="top: 1400px;  left: 1200px;">abyss 1</div>
    <div class="abyss-marker" style="top: 4200px;  left: 2800px;">abyss 2</div>
    <div class="abyss-marker" style="top: 7000px;  left: 1200px;">abyss 3</div>
    <div class="abyss-marker" style="top: 9800px;  left: 2800px;">abyss 4</div>
    <div class="abyss-marker" style="top: 12600px; left: 1200px;">abyss 5</div>

    <!-- Path spine — actual Catmull-Rom curve through all waypoints -->
    <svg class="path-spine" viewBox="0 0 4000 14000" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <!-- Main curve -->
      <path
        :d="svgPath"
        fill="none"
        stroke="rgba(201,149,108,0.25)"
        stroke-width="3"
        stroke-dasharray="16 10"
      />
      <!-- Waypoint dots -->
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
  transform: translate(-50%, -50%);
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
  transform: translate(-50%, -50%);
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
