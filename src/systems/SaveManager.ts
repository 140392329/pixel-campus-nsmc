import { SAVE_KEY } from '../config';
import type { Facing } from '../types';

export interface SaveData {
  version: 1;
  player: { map: string; x: number; y: number; facing: Facing; name: string };
  clockMinutes: number;
  savedAt: number;
}

export function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, any>;
  if (obj.version !== 1) return null;
  const p = obj.player;
  if (!p || typeof p.map !== 'string') return null;
  if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
  if (typeof obj.clockMinutes !== 'number') return null;
  const facing: Facing = ['up', 'down', 'left', 'right'].includes(p.facing) ? p.facing : 'down';
  return {
    version: 1,
    player: { map: p.map, x: p.x, y: p.y, facing, name: String(p.name ?? '同学') },
    clockMinutes: Math.max(0, Math.min(1439, obj.clockMinutes)),
    savedAt: typeof obj.savedAt === 'number' ? obj.savedAt : Date.now(),
  };
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // ignore
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
