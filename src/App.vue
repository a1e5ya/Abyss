<script setup lang="ts">
import WorldContainer from './world/WorldContainer.vue'
</script>

<template>
  <WorldContainer>
    <!-- Phase 1 placeholder: visible markers so world movement is obvious -->

    <!-- Station markers -->
    <div class="station" style="top: 0px;">
      <span>HERO</span>
      <small>y = 0</small>
    </div>
    <div class="station" style="top: 2800px;">
      <span>PORTRAIT GALLERY</span>
      <small>y = 2800</small>
    </div>
    <div class="station" style="top: 5600px;">
      <span>PRODUCT GALLERY</span>
      <small>y = 5600</small>
    </div>
    <div class="station" style="top: 8400px;">
      <span>WEB PROJECTS</span>
      <small>y = 8400</small>
    </div>
    <div class="station" style="top: 11200px;">
      <span>3D WORKS</span>
      <small>y = 11200</small>
    </div>
    <div class="station" style="top: 14000px;">
      <span>CONTACTS</span>
      <small>y = 14000</small>
    </div>

    <!-- Abyss markers -->
    <div class="abyss-marker" style="top: 1400px; left: 1400px;">abyss 1</div>
    <div class="abyss-marker" style="top: 4200px; left: 2600px;">abyss 2</div>
    <div class="abyss-marker" style="top: 7000px; left: 1600px;">abyss 3</div>
    <div class="abyss-marker" style="top: 9800px; left: 2400px;">abyss 4</div>
    <div class="abyss-marker" style="top: 12600px; left: 1800px;">abyss 5</div>

    <!-- Path spine (visual guide) -->
    <svg class="path-spine" viewBox="0 0 4000 14000" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 2000 0 C 1200 4667, 2800 9333, 2000 14000"
        fill="none"
        stroke="rgba(201,149,108,0.15)"
        stroke-width="2"
        stroke-dasharray="12 8"
      />
      <!-- Control point indicators -->
      <circle cx="2000" cy="0" r="8" fill="#c9956c" opacity="0.5" />
      <circle cx="1200" cy="4667" r="6" fill="#a855f7" opacity="0.4" />
      <circle cx="2800" cy="9333" r="6" fill="#a855f7" opacity="0.4" />
      <circle cx="2000" cy="14000" r="8" fill="#c9956c" opacity="0.5" />
    </svg>
  </WorldContainer>
</template>

<style>
/* Station placeholder blocks */
.station {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
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

/* Abyss zone markers */
.abyss-marker {
  position: absolute;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--col-glow);
  opacity: 0.4;
  text-transform: uppercase;
}

/* Path spine SVG — spans full world */
.path-spine {
  position: absolute;
  top: 0;
  left: 0;
  width: 4000px;
  height: 14000px;
  pointer-events: none;
}
</style>
