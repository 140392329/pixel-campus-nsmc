import { MEMORY_KEY } from '../config';
import type { ChatTurn } from '../types';

/** 每人最多保留 24 条消息（12 轮问答），保留首轮 + 尾部滑窗。 */
const MEMORY_CAP = 24;

export function trimMemory(turns: ChatTurn[], maxMessages: number): ChatTurn[] {
  if (maxMessages <= 0) return [];
  if (turns.length <= maxMessages) return turns.slice();
  const keepHead = Math.min(2, maxMessages);
  const tailCount = Math.max(0, maxMessages - keepHead);
  return [...turns.slice(0, keepHead), ...turns.slice(turns.length - tailCount)];
}

function isTurn(v: unknown): v is ChatTurn {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string';
}

const memory = new Map<string, ChatTurn[]>();

/** 从 localStorage 恢复对话记忆；损坏或隐私模式下静默降级为空。 */
export function loadMemory(): void {
  memory.clear();
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    for (const [id, turns] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(turns)) continue;
      const valid = turns.filter(isTurn).map((t) => ({
        role: t.role,
        content: t.content,
        at: typeof t.at === 'number' ? t.at : Date.now(),
      }));
      if (valid.length) memory.set(id, trimMemory(valid, MEMORY_CAP));
    }
  } catch {
    // ignore
  }
}

/** 把全部记忆写回 localStorage。 */
export function persistMemory(): void {
  try {
    const obj: Record<string, ChatTurn[]> = {};
    for (const [id, turns] of memory) obj[id] = trimMemory(turns, MEMORY_CAP);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

export function getMemory(npcId: string): ChatTurn[] {
  return memory.get(npcId) ?? [];
}

export function pushTurn(npcId: string, turn: ChatTurn): void {
  const list = memory.get(npcId) ?? [];
  list.push(turn);
  memory.set(npcId, trimMemory(list, MEMORY_CAP));
  persistMemory();
}

export function clearAllMemory(): void {
  memory.clear();
  try {
    localStorage.removeItem(MEMORY_KEY);
  } catch {
    // ignore
  }
}
