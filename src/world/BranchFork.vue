<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { activeBranch } from '../composables/useWorldCamera'
import { BRANCHES, FORK_Y, MERGE_Y, buildSvgPath, evalWorldPoint, tangentAngle } from '../composables/usePath'
import type { BranchId } from '../composables/usePath'
import { useScrollEngine } from '../composables/useScrollEngine'

const { smoothScrollY } = useScrollEngine()

const WORLD_HEIGHT = 14000
const forkProgress  = FORK_Y  / WORLD_HEIGHT
const mergeProgress = MERGE_Y / WORLD_HEIGHT

const inForkZone = computed(() => {
  const p = smoothScrollY.value / WORLD_HEIGHT
  return p >= forkProgress - 0.03 && p <= mergeProgress + 0.03
})

// ── Input: horizontal scroll wheel → A or C ───────────────────────────────────
let driftX = 0
let wasInZone = false

function onWheel(e: WheelEvent) {
  if (!inForkZone.value) return
  driftX += e.deltaX
  if (Math.abs(driftX) > 80) {
    activeBranch.value = driftX < 0 ? 'A' : 'C'
  } else {
    activeBranch.value = 'B'
  }
}

// ── Input: arrow keys → A / B / C ────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (!inForkZone.value) return
  if (e.key === 'ArrowLeft')  { activeBranch.value = 'A'; e.preventDefault() }
  if (e.key === 'ArrowRight') { activeBranch.value = 'C'; e.preventDefault() }
}

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKey)
})

// Reset drift accumulator on zone entry
const resetId = setInterval(() => {
  if (inForkZone.value && !wasInZone) { driftX = 0; wasInZone = true }
  if (!inForkZone.value) wasInZone = false
}, 100)
onUnmounted(() => clearInterval(resetId))

// ── Input: tap/click label ────────────────────────────────────────────────────
function chooseBranch(id: BranchId) { activeBranch.value = id }

// ── Label / flower positioning ────────────────────────────────────────────────
// Mid-branch world progress for each branch
const MID_PROGRESS = (forkProgress + mergeProgress) / 2

function midBranchPoint(id: BranchId) {
  return evalWorldPoint(MID_PROGRESS, id)
}

function midBranchAngle(id: BranchId) {
  return tangentAngle(MID_PROGRESS, id)
}

function labelStyle(id: BranchId) {
  const pt = midBranchPoint(id)
  const angle = midBranchAngle(id)
  return {
    position: 'absolute' as const,
    left:      `${pt.x}px`,
    top:       `${pt.y - 80}px`,   // slightly above mid-branch
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

// Flowers: 2–3 small objects per branch, evenly spaced along the branch
const FLOWER_OFFSETS = [0.25, 0.5, 0.75]  // 3 flowers per branch, at 25/50/75% of branch

// Flower shapes per branch
const FLOWERS: Record<BranchId, { emoji: string; size: number }[]> = {
  A: [
    { emoji: '✿', size: 28 },
    { emoji: '❀', size: 22 },
    { emoji: '✿', size: 18 },
  ],
  B: [
    { emoji: '❋', size: 24 },
    { emoji: '✦', size: 20 },
  ],
  C: [
    { emoji: '✾', size: 26 },
    { emoji: '❃', size: 20 },
    { emoji: '✾', size: 18 },
  ],
}

function flowerStyle(id: BranchId, offset: number) {
  const p = forkProgress + (mergeProgress - forkProgress) * offset
  const pt = evalWorldPoint(p, id)
  const angle = tangentAngle(p, id)
  return {
    position: 'absolute' as const,
    left:      `${pt.x}px`,
    top:       `${pt.y}px`,
    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
  }
}

const branchMeta: Record<BranchId, { label: string; input: string; color: string }> = {
  A: { label: 'A', input: '← or tap',   color: '#f9a8d4' },
  B: { label: 'B', input: 'straight',   color: '#6ee7b7' },
  C: { label: 'C', input: '→ or keys',  color: '#c4b5fd' },
}
</script>

<template>
  <!-- Branch paths and objects are always in the world (not gated by inForkZone)
       so flowers are visible as you approach. Labels appear only near the fork. -->

  <!-- Branch path outlines -->
  <svg class="branch-svg" viewBox="0 0 4000 14000" preserveAspectRatio="none">
    <path
      v-for="(pts, id) in BRANCHES" :key="id"
      :d="buildSvgPath(pts)"
      fill="none"
      :stroke="branchMeta[id as BranchId].color"
      :stroke-width="activeBranch === id ? 3 : 1.5"
      :stroke-dasharray="activeBranch === id ? 'none' : '8 7'"
      :opacity="activeBranch === id ? 0.6 : 0.2"
      style="transition: stroke-width 0.3s, opacity 0.3s"
    />
  </svg>

  <!-- Flowers along each branch -->
  <template v-for="(flowers, id) in FLOWERS" :key="id">
    <div
      v-for="(flower, fi) in flowers" :key="fi"
      class="flower"
      :style="{
        ...flowerStyle(id as BranchId, FLOWER_OFFSETS[fi]),
        fontSize: `${flower.size}px`,
        color: branchMeta[id as BranchId].color,
        opacity: activeBranch === id ? 1 : 0.3,
      }"
    >{{ flower.emoji }}</div>
  </template>

  <!-- Branch labels — visible only near fork zone, clickable -->
  <template v-if="inForkZone">
    <div
      v-for="(meta, id) in branchMeta" :key="id"
      class="branch-label"
      :class="{ active: activeBranch === id }"
      :style="labelStyle(id as BranchId)"
      @click="chooseBranch(id as BranchId)"
    >
      <span class="branch-name" :style="{ color: meta.color }">{{ meta.label }}</span>
      <span class="branch-input">{{ meta.input }}</span>
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

.flower {
  position: absolute;
  pointer-events: none;
  line-height: 1;
  transition: opacity 0.4s;
  filter: drop-shadow(0 0 6px currentColor);
  user-select: none;
}

.branch-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(13, 17, 23, 0.8);
  backdrop-filter: blur(8px);
  cursor: pointer;
  pointer-events: auto;
  transition: border-color 0.2s, background 0.2s;
}

.branch-label.active {
  border-color: rgba(255,255,255,0.35);
  background: rgba(13, 17, 23, 0.95);
}

.branch-name {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.25em;
  font-weight: 700;
}

.branch-input {
  font-family: ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.35);
}
</style>
