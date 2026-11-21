import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../config';
import type { LlmSettings } from '../types';

let cache: LlmSettings | null = null;

export function loadSettings(): LlmSettings {
  if (cache) return { ...cache };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LlmSettings>;
      cache = { ...DEFAULT_SETTINGS, ...parsed };
      // 旧的存档没有 clockSpeed 或值损坏时回退到 1×
      if (![0.5, 1, 2].includes(cache.clockSpeed)) cache.clockSpeed = 1;
      return { ...cache };
    }
  } catch {
    // localStorage 不可用或数据损坏，降级为内存态
  }
  cache = { ...DEFAULT_SETTINGS };
  return { ...cache };
}

export function saveSettings(next: LlmSettings): void {
  cache = { ...next };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式下写入失败，保留内存态
  }
}

export function hasApiKey(): boolean {
  return loadSettings().apiKey.trim().length > 0;
}
