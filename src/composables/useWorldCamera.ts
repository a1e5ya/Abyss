import { computed, ref } from 'vue'
import type { Ref } from 'vue'

// ── Main spine waypoints ──────────────────────────────────────────────────────
export const WAYPOINTS = [
  { x: 2000, y: 0,     label: 'hero'     },
  { x: 1200, y: 1400,  label: 'abyss1'   },
  { x: 2000, y: 2800,  label: 'portrait' },
  { x: 2800, y: 4200,  label: 'abyss2'   },
  { x: 2000, y: 5600,  label: 'product'  },
  { x: 1200, y: 7000,  label: 'abyss3'   },
  { x: 2000, y: 8400,  label: 'web'      },
  { x: 2800, y: 9800,  label: 'abyss4'   },
  { x: 2000, y: 11200, label: '3d'       },
  { x: 1200, y: 12600, label: 'abyss5'   },
  { x: 2000, y: 14000, label: 'contacts' },
]

// ── Catmull-Rom spine math ────────────────────────────────────────────────────
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

export function evalSpline(progress: number): { x: number; y: number } {
  const pts  = WAYPOINTS
  const segs = pts.length - 1
  const scaled = Math.min(progress * segs, segs - 0.0001)
  const i  = Math.floor(scaled)
  const t  = scaled - i
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(pts.length - 1, i + 2)]
  return {
    x: cr(p0.x, p1.x, p2.x, p3.x, t),
    y: cr(p0.y, p1.y, p2.y, p3.y, t),
  }
}

function evalTangent(progress: number) {
  const eps = 0.001
  const a = evalSpline(Math.max(0, progress - eps))
  const b = evalSpline(Math.min(1, progress + eps))
  return { dx: b.x - a.x, dy: b.y - a.y }
}

export function progressOf(label: string): number {
  const i = WAYPOINTS.findIndex(w => w.label === label)
  return i < 0 ? 0 : i / (WAYPOINTS.length - 1)
}

export function getTangentAngle(progress: number): number {
  const { dx, dy } = evalTangent(progress)
  return Math.atan2(dx, dy) * (180 / Math.PI)
}

// Polyline approximation of the spine between two progress values.
// Used to draw a thick "wide spine" segment (e.g., Abyss 3 Sankey section).
export function buildSpineSegment(fromProgress: number, toProgress: number, steps = 40): string {
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const p = fromProgress + (toProgress - fromProgress) * (i / steps)
    const { x, y } = evalSpline(p)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return `M ${pts.join(' L ')}`
}

export function buildSvgPath(): string {
  const pts = WAYPOINTS
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
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`
  }
  return d
}

// ── Abyss 3 highpoints ────────────────────────────────────────────────────────
// Floating objects around a central atmospheric zone.
// No connections, no ribbons — just positions in world space.
export interface Highpoint {
  label:  string
  x:      number
  y:      number
  color:  string   // full rgba string used for glow and dwell ring
  size:   number   // diameter in px
}

// Center of the Abyss 3 zone — spine waypoint
export const ABYSS3_CENTER = { x: 1200, y: 7000 }

export interface Highpoint {
  label:  string
  px:     number   // 0–1 fraction of station width  (left→right)
  py:     number   // 0–1 fraction of station height (top→bottom)
  color:  string
  size:   number
}

export const ABYSS3_HIGHPOINTS: Highpoint[] = [
  { label: 'alpha', px: 0.18, py: 0.22, color: 'rgba(45,212,191,1)',  size: 120 },
  { label: 'beta',  px: 0.82, py: 0.30, color: 'rgba(251,113,133,1)', size: 90  },
  { label: 'gamma', px: 0.15, py: 0.70, color: 'rgba(110,231,183,1)', size: 100 },
  { label: 'delta', px: 0.80, py: 0.76, color: 'rgba(253,230,138,1)', size: 80  },
]

// Convert fraction-based highpoint to world coords given the station dimensions.
// stationW = station width in px, stationH = station height in px (100dvh).
export function highpointWorldPos(hp: Highpoint, stationW: number, stationH: number) {
  return {
    x: ABYSS3_CENTER.x + (hp.px - 0.5) * stationW,
    y: ABYSS3_CENTER.y + (hp.py - 0.5) * stationH,
  }
}

// Cursor world position — used by useDwell to detect hover over objects
export const cursorWorldX = ref(0)
export const cursorWorldY = ref(0)

// ── Camera override ───────────────────────────────────────────────────────────
// useDwell writes here to move the camera off-spine to an object.
// null = follow spine normally.
export const cameraOverridePos = ref<{ x: number; y: number } | null>(null)

// ── Main composable ───────────────────────────────────────────────────────────
export function useWorldCamera(pathProgress: Ref<number>) {
  const cameraX = computed(() =>
    cameraOverridePos.value !== null
      ? cameraOverridePos.value.x
      : evalSpline(pathProgress.value).x
  )
  const cameraY = computed(() =>
    cameraOverridePos.value !== null
      ? cameraOverridePos.value.y
      : evalSpline(pathProgress.value).y
  )

  const rotation = computed(() => {
    const { dx, dy } = evalTangent(pathProgress.value)
    return Math.atan2(dx, dy) * (180 / Math.PI)
  })

  // cursorNudge is injected by WorldContainer after useCursor() is available.
  // Default: no nudge. Using a module-level ref so it survives across composable calls.
  const worldTransform = computed(() => {
    const nx = cursorNudgeX.value + highpointNudgeX.value
    const ny = cursorNudgeY.value + highpointNudgeY.value
    return `translate(50vw, 50vh) translate(${-nx}px, ${-ny}px) rotate(${rotation.value}deg) translate(${-cameraX.value}px, ${-cameraY.value}px)`
  })

  return { cameraX, cameraY, rotation, worldTransform }
}

// Written by WorldContainer from cursorSx/Sy
export const cursorNudgeX = ref(0)
export const cursorNudgeY = ref(0)

// Written by useDwell — additive pull toward nearest highpoint
export const highpointNudgeX = ref(0)
export const highpointNudgeY = ref(0)
