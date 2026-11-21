import type { Facing, NpcRuntimeState } from '../types';

const FACING_VEC: Record<Facing, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function pickInteractable(
  player: { x: number; y: number; facing: Facing },
  npcs: NpcRuntimeState[],
  maxDistPx = 64,
): NpcRuntimeState | null {
  const dir = FACING_VEC[player.facing];
  let best: NpcRuntimeState | null = null;
  let bestDist = Infinity;
  for (const npc of npcs) {
    if (npc.mode === 'talking') continue;
    const dx = npc.pos.x - player.x;
    const dy = npc.pos.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDistPx || dist === 0) continue;
    const dot = (dx / dist) * dir.x + (dy / dist) * dir.y;
    if (dot < 0.5) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = npc;
    }
  }
  return best;
}
