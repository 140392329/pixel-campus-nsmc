import type { ClockPhase } from '../types';

export function clockToPhase(minutes: number): ClockPhase {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (m >= 5 * 60 && m < 7 * 60) return 'dawn';
  if (m >= 7 * 60 && m < 17 * 60) return 'day';
  if (m >= 17 * 60 && m < 20 * 60) return 'dusk';
  return 'night';
}

export class ClockSystem {
  private minutes: number;
  /** 虚拟时钟倍率：现实 1 秒 = speed 游戏分钟。 */
  speed = 1;

  constructor(startMinutes = 8 * 60) {
    this.minutes = startMinutes;
  }

  update(deltaMs: number): void {
    this.minutes = (this.minutes + (deltaMs / 1000) * this.speed) % 1440;
  }

  get value(): number {
    return this.minutes;
  }

  set value(v: number) {
    this.minutes = ((v % 1440) + 1440) % 1440;
  }

  get hhmm(): string {
    const total = Math.floor(this.minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  get phase(): ClockPhase {
    return clockToPhase(this.minutes);
  }
}
