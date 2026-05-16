// Path graph: waypoints, segments, and branch definitions.
// A "segment" is a Catmull-Rom spline through an ordered list of waypoints.
// Branches fork from a junction point and rejoin at a merge point.

export interface Waypoint {
  x: number
  y: number
}

// ─── Catmull-Rom math ────────────────────────────────────────────────────────

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

function crD(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    (-p0 + p2) +
    2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
    3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t * t
  )
}

function evalSpline(pts: Waypoint[], progress: number): Waypoint {
  const segs = pts.length - 1
  const scaled = Math.min(progress * segs, segs - 0.0001)
  const i = Math.floor(scaled)
  const t = scaled - i
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(pts.length - 1, i + 2)]
  return { x: cr(p0.x, p1.x, p2.x, p3.x, t), y: cr(p0.y, p1.y, p2.y, p3.y, t) }
}

function evalSplineTangent(pts: Waypoint[], progress: number): Waypoint {
  const segs = pts.length - 1
  const scaled = Math.min(progress * segs, segs - 0.0001)
  const i = Math.floor(scaled)
  const t = scaled - i
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(pts.length - 1, i + 2)]
  return { x: crD(p0.x, p1.x, p2.x, p3.x, t), y: crD(p0.y, p1.y, p2.y, p3.y, t) }
}

// ─── SVG path builder (Catmull-Rom → cubic bezier) ──────────────────────────

export function buildSvgPath(pts: Waypoint[]): string {
  if (pts.length < 2) return ''
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

// ─── World path definition ───────────────────────────────────────────────────

// Main spine before the fork.
// Rule: the last two points define the exit direction into the fork.
// Keep them vertically aligned (same x) so the tangent at Portrait Gallery
// points straight down — no lateral pull from the fork junction.
export const MAIN_BEFORE: Waypoint[] = [
  { x: 2000, y: 0 },      // Hero
  { x: 1200, y: 1400 },   // Abyss 1 — swing left
  { x: 2000, y: 2800 },   // Portrait Gallery
  { x: 2000, y: 3200 },   // straight exit toward fork (same x — no twist)
]

export const MAIN_AFTER: Waypoint[] = [
  { x: 2000, y: 5200 },   // straight entry from merge (same x — no twist)
  { x: 2000, y: 5600 },   // Product Gallery
  { x: 1200, y: 7000 },   // Abyss 3 — swing left
  { x: 2000, y: 8400 },   // Web Projects
  { x: 2800, y: 9800 },   // Abyss 4 — swing right
  { x: 2000, y: 11200 },  // 3D Works
  { x: 1200, y: 12600 },  // Abyss 5 — swing left
  { x: 2000, y: 14000 },  // Contacts
]

// Fork junction and merge point (world-space y)
export const FORK_Y  = 3400
export const MERGE_Y = 5000

// Three branches through abyss 2 (y FORK_Y → MERGE_Y).
// Each branch starts and ends with a vertical segment (dx=0 relative to
// the spine) so Catmull-Rom never pulls the path backward.
// The "ghost" points for CR at i=0 are duplicated to prevent backward pull.
export const BRANCHES: Record<string, Waypoint[]> = {
  // Branch A — left arc, input: tap/click label
  A: [
    { x: 2000, y: 3400 },  // entry — matches spine
    { x: 2000, y: 3550 },  // short straight down before curving
    { x: 1100, y: 3900 },  // peak left
    { x: 1100, y: 4200 },  // linger left
    { x: 2000, y: 4800 },  // return to center
    { x: 2000, y: 5000 },  // exit — matches spine
  ],
  // Branch B — straight, input: default / drift
  B: [
    { x: 2000, y: 3400 },
    { x: 2000, y: 4200 },
    { x: 2000, y: 5000 },
  ],
  // Branch C — right arc, input: arrow keys / horizontal scroll
  C: [
    { x: 2000, y: 3400 },  // entry
    { x: 2000, y: 3550 },  // short straight down
    { x: 2900, y: 3900 },  // peak right
    { x: 2900, y: 4200 },  // linger right
    { x: 2000, y: 4800 },  // return to center
    { x: 2000, y: 5000 },  // exit
  ],
}

export type BranchId = 'A' | 'B' | 'C'

// ─── Full path evaluator ─────────────────────────────────────────────────────
// progress 0→1 maps to the full world journey (y 0→14000).
// The branch section (y 3500→4900) uses the active branch.

const WORLD_HEIGHT = 14000
const FORK_PROGRESS  = FORK_Y  / WORLD_HEIGHT
const MERGE_PROGRESS = MERGE_Y / WORLD_HEIGHT

export function evalWorldPoint(progress: number, branch: BranchId): Waypoint {
  if (progress <= FORK_PROGRESS) {
    const t = progress / FORK_PROGRESS
    return evalSpline(MAIN_BEFORE, t)
  }
  if (progress >= MERGE_PROGRESS) {
    const t = (progress - MERGE_PROGRESS) / (1 - MERGE_PROGRESS)
    return evalSpline(MAIN_AFTER, t)
  }
  const t = (progress - FORK_PROGRESS) / (MERGE_PROGRESS - FORK_PROGRESS)
  return evalSpline(BRANCHES[branch], t)
}

export function evalWorldTangent(progress: number, branch: BranchId): Waypoint {
  const eps = 0.0002
  const a = evalWorldPoint(Math.max(0, progress - eps), branch)
  const b = evalWorldPoint(Math.min(1, progress + eps), branch)
  return { x: b.x - a.x, y: b.y - a.y }
}

export function tangentAngle(progress: number, branch: BranchId): number {
  const { x, y } = evalWorldTangent(progress, branch)
  return Math.atan2(x, y) * (180 / Math.PI)
}

// Pre-computed tangent angles at each station waypoint (for counter-rotation)
// Station progress values (y / 14000)
export const STATION_PROGRESS: Record<string, number> = {
  hero:      0 / WORLD_HEIGHT,
  portrait:  2800 / WORLD_HEIGHT,
  product:   5600 / WORLD_HEIGHT,
  web:       8400 / WORLD_HEIGHT,
  works3d:   11200 / WORLD_HEIGHT,
  contacts:  14000 / WORLD_HEIGHT,
}
