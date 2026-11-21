import { el, button } from './dom';

export interface HudHandlers {
  onSettings: () => void;
  onHelp: () => void;
  onSave: () => void;
}

export class Hud {
  private clockEl: HTMLElement;
  private zoneEl: HTMLElement;
  private promptEl: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;

  constructor(root: HTMLElement, handlers: HudHandlers) {
    const top = el('div', 'hud-top');
    this.clockEl = el('span', 'clock', '08:00');
    this.zoneEl = el('span', 'zone', '临江校区');
    top.append(this.clockEl, this.zoneEl);

    const buttons = el('div', 'hud-buttons');
    buttons.append(
      button('设置', handlers.onSettings),
      button('帮助', handlers.onHelp),
      button('存档', handlers.onSave),
    );

    this.promptEl = el('div', 'prompt');
    this.toastEl = el('div', 'toast');
    root.append(top, buttons, this.promptEl, this.toastEl);
  }

  setClock(hhmm: string): void {
    this.clockEl.textContent = hhmm;
  }

  setZone(name: string): void {
    this.zoneEl.textContent = name;
  }

  showPrompt(text: string | null): void {
    if (text) {
      this.promptEl.textContent = text;
      this.promptEl.classList.add('show');
    } else {
      this.promptEl.classList.remove('show');
    }
  }

  toast(text: string, ms = 2200): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }
}
