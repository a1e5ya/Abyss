<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { activeBranch } from '../composables/useWorldCamera'
import { BRANCHES, FORK_Y, MERGE_Y, buildSvgPath, tangentAngle } from '../composables/usePath'
import type { BranchId } from '../composables/usePath'
import { useScrollEngine } from '../composables/useScrollEngine'

const { smoothScrollY } = useScrollEngine()

const WORLD_HEIGHT = 14000
const forkProgress  = FORK_Y  / WORLD_HEIGHT
const mergeProgress = MERGE_Y / WORLD_HEIGHT

// Are we inside the fork zone?
const inForkZone = computed(() => {
  const p = smoothScrollY.value / WORLD_HEIGHT
  return p >= forkProgress - 0.02 && p <= mergeProgress + 0.02
})

// ── Branch B: drift / momentum (horizontal scroll delta) ─────────────────────
let driftX = 0
let lastScrollX = 0

function onWheel(e: WheelEvent) {
  if (!inForkZone.value) return
  driftX += e.deltaX
  if (Math.abs(driftX) > 80) {
    activeBranch.value = driftX < 0 ? 'A' : 'C'
  } else {
    activeBranch.value = 'B'
  }
}

// ── Branch C: arrow keys ──────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (!inForkZone.value) return
  if (e.key === 'ArrowLeft')  { activeBranch.value = 'A'; e.preventDefault() }
  if (e.key === 'ArrowRight') { activeBranch.value = 'C'; e.preventDefault() }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { activeBranch.value = 'B' }
}

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKey)
})

// Reset drift when leaving zone
// (watcher would add complexity — simple approach: reset on zone entry)
let wasInZone = false
function tick() {
  if (inForkZone.value && !wasInZone) {
    driftX = 0
    wasInZone = true
  }
  if (!inForkZone.value) wasInZone = false
}
const rafId = setInterval(tick, 100)
onUnmounted(() => clearInterval(rafId))

// Branch click handler (Branch A input method)
function chooseBranch(id: BranchId) {
  activeBranch.value = id
}

// Counter-rotation for each branch endpoint label
function branchLabelStyle(id: BranchId) {
  const pts = BRANCHES[id]
  const mid = pts[Math.floor(pts.length / 2)]
  const angle = tangentAngle(0.5, id)  // approx mid-branch tangent
  return {
    position: 'absolute' as const,
    left: `${mid.x}px`,
    top:  `${mid.y}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

const branchMeta: Record<BranchId, { label: string; input: string; color: string }> = {
  A: { label: 'BRANCH A', input: '← scroll or arrow key', color: '#f9a8d4' },  // iris-pink
  B: { label: 'BRANCH B', input: 'drift / straight',       color: '#6ee7b7' },  // iris-mint
  C: { label: 'BRANCH C', input: '→ scroll or arrow key',  color: '#c4b5fd' },  // iris-lavender
}
</script>

<template>
  <template v-if="inForkZone">
    <!-- Branch path outlines in SVG -->
    <svg class="branch-svg" viewBox="0 0 4000 14000" preserveAspectRatio="none">
      <path
        v-for="(pts, id) in BRANCHES" :key="id"
        :d="buildSvgPath(pts)"
        fill="none"
        :stroke="branchMeta[id as BranchId].color"
        :stroke-width="activeBranch === id ? 4 : 2"
        :stroke-dasharray="activeBranch === id ? 'none' : '10 8'"
        :opacity="activeBranch === id ? 0.7 : 0.3"
        style="transition: all 0.3s"
      />
    </svg>

    <!-- Branch indicator labels (clickable = Branch A input method) -->
    <div
      v-for="(meta, id) in branchMeta" :key="id"
      class="branch-label"
      :class="{ active: activeBranch === id }"
      :style="branchLabelStyle(id as BranchId)"
      @click="chooseBranch(id as BranchId)"
    >
      <div class="branch-name" :style="{ color: meta.color }">{{ meta.label }}</div>
      <div class="branch-input">{{ meta.input }}</div>
      <div class="branch-tap" v-if="id === 'A'">TAP TO CHOOSE</div>
    </div>
  </template>
</template>

<style scoped>
.branch-svg {
  position: absolute;
  top: 0; left: 0;
  width: 4000px;
  height: 14000px;
  pointer-events: none;
}

.branch-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(13, 17, 23, 0.75);
  backdrop-filter: blur(6px);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  pointer-events: auto;
}

.branch-label.active {
  background: rgba(13, 17, 23, 0.92);
  border-color: rgba(255,255,255,0.3);
}

.branch-name {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  font-weight: 600;
}

.branch-input {
  font-family: ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.4);
}

.branch-tap {
  font-family: ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.15em;
  color: #f9a8d4;
  margin-top: 4px;
}
</style>
