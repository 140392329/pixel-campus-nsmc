import type { NpcDef } from '../types';

export function parseTime(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return -1;
  return h * 60 + min;
}

function inSlot(minutes: number, from: number, to: number): boolean {
  if (from === to) return true;
  if (from < to) return minutes >= from && minutes < to;
  return minutes >= from || minutes < to;
}

export interface ResolvedNpcState {
  anchorId: string;
  zoneId: string;
  activity: string;
}

export function resolveNpcState(
  def: NpcDef,
  minutes: number,
  zoneOfAnchor?: (anchorId: string) => string | undefined,
): ResolvedNpcState {
  for (const s of def.schedule) {
    const from = parseTime(s.from);
    const to = parseTime(s.to);
    if (from < 0 || to < 0) continue;
    if (inSlot(minutes, from, to)) {
      return { anchorId: s.anchorId, zoneId: s.zoneId, activity: s.activity };
    }
  }
  const fallbackSlot = def.schedule[def.schedule.length - 1];
  return {
    anchorId: def.defaultAnchor,
    zoneId: fallbackSlot?.zoneId ?? zoneOfAnchor?.(def.defaultAnchor) ?? '',
    activity: '休息',
  };
}
