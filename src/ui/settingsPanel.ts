import { button, el } from './dom';
import { loadSettings, saveSettings } from '../systems/Settings';
import { testConnection } from '../dialog/llmClient';
import { clearAllMemory } from '../dialog/memory';
import { clearSave } from '../systems/SaveManager';
import type { LlmSettings } from '../types';

export class SettingsPanel {
  private backdrop: HTMLElement;
  private baseUrl: HTMLInputElement;
  private model: HTMLInputElement;
  private apiKey: HTMLInputElement;
  private playerName: HTMLInputElement;
  private speed: HTMLSelectElement;
  private statusEl: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private onSaved: (s: LlmSettings) => void;

  constructor(root: HTMLElement, onSaved: (s: LlmSettings) => void) {
    this.onSaved = onSaved;
    this.backdrop = el('div', 'modal-backdrop');
    const modal = el('div', 'modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '设置');

    const h = el('h2', '', '设置');
    const hint = el(
      'p',
      'hint',
      'AI 对话使用任意 OpenAI 兼容接口（DeepSeek / 通义 / GPT 等）。Key 仅保存在本机浏览器，不会上传到任何服务器。',
    );

    const baseField = el('div', 'field');
    this.baseUrl = el('input');
    this.baseUrl.type = 'text';
    this.baseUrl.placeholder = 'https://api.openai.com/v1';
    baseField.append(el('label', '', 'Base URL'), this.baseUrl);

    const modelField = el('div', 'field');
    this.model = el('input');
    this.model.type = 'text';
    this.model.placeholder = 'gpt-4o-mini';
    modelField.append(el('label', '', '模型'), this.model);

    const keyField = el('div', 'field');
    this.apiKey = el('input');
    this.apiKey.type = 'password';
    this.apiKey.placeholder = 'sk-...';
    this.apiKey.autocomplete = 'off';
    keyField.append(el('label', '', 'API Key'), this.apiKey);

    const nameField = el('div', 'field');
    this.playerName = el('input');
    this.playerName.type = 'text';
    this.playerName.maxLength = 8;
    this.playerName.placeholder = '同学';
    nameField.append(el('label', '', '玩家称呼'), this.playerName);

    const scaleField = el('div', 'field');
    const scale = el('select');
    for (const [value, label] of [
      ['1', '100%'],
      ['1.25', '125%'],
      ['1.5', '150%'],
    ]) {
      const opt = el('option', '', label);
      opt.value = value;
      scale.append(opt);
    }
    scale.addEventListener('change', () => {
      document.documentElement.style.setProperty('--ui-scale', scale.value);
      try {
        localStorage.setItem('cbmu.uiscale', scale.value);
      } catch {
        // ignore
      }
    });
    scaleField.append(el('label', '', '界面字号'), scale);

    const speedField = el('div', 'field');
    this.speed = el('select');
    for (const [value, label] of [
      ['0.5', '0.5×（慢）'],
      ['1', '1×（标准）'],
      ['2', '2×（快）'],
    ]) {
      const opt = el('option', '', label);
      opt.value = value;
      this.speed.append(opt);
    }
    speedField.append(el('label', '', '时间流速'), this.speed);

    const warn = el(
      'div',
      'warn',
      '请勿在公用电脑填写 Key。Key 为明文存储，仅用于本机浏览器直连 AI 服务。',
    );

    this.statusEl = el('div', 'status');
    const row = el('div', 'row');
    const testBtn = button('测试连接', () => void this.test(), 'ui-btn');
    const saveBtn = button('保存', () => this.save(), 'ui-btn primary');
    this.closeBtn = button('关闭', () => this.close(), 'ui-btn ghost');
    const clearKeyBtn = button('清除 Key', () => this.clearKey(), 'ui-btn ghost');
    const clearMemBtn = button('清除对话记忆', () => this.clearMemory(), 'ui-btn ghost');
    const clearSaveBtn = button('清除存档', () => this.resetSave(), 'ui-btn ghost');
    row.append(testBtn, saveBtn, this.closeBtn, clearKeyBtn, clearMemBtn, clearSaveBtn);

    modal.append(h, hint, baseField, modelField, keyField, nameField, scaleField, speedField, warn, this.statusEl, row);
    this.backdrop.append(modal);
    root.append(this.backdrop);

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
      if (e.key === 'Tab') this.trapFocus(e, modal);
    });
    this.loadScale(scale);
  }

  private loadScale(select: HTMLSelectElement): void {
    try {
      const v = localStorage.getItem('cbmu.uiscale') ?? '1';
      select.value = v;
      document.documentElement.style.setProperty('--ui-scale', v);
    } catch {
      // ignore
    }
  }

  private trapFocus(e: KeyboardEvent, modal: HTMLElement): void {
    const focusables = modal.querySelectorAll<HTMLElement>('button, input, select');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  get isOpen(): boolean {
    return this.backdrop.classList.contains('open');
  }

  open(): void {
    const s = loadSettings();
    this.baseUrl.value = s.baseUrl;
    this.model.value = s.model;
    this.apiKey.value = s.apiKey;
    this.playerName.value = s.playerName;
    this.speed.value = String(s.clockSpeed ?? 1);
    this.statusEl.textContent = '';
    this.statusEl.className = 'status';
    this.backdrop.classList.add('open');
    window.setTimeout(() => this.apiKey.focus(), 30);
  }

  close(): void {
    this.backdrop.classList.remove('open');
  }

  private collect(): LlmSettings {
    return {
      baseUrl: this.baseUrl.value.trim() || 'https://api.openai.com/v1',
      model: this.model.value.trim() || 'gpt-4o-mini',
      apiKey: this.apiKey.value.trim(),
      playerName: this.playerName.value.trim() || '同学',
      clockSpeed: Number(this.speed.value) || 1,
    };
  }

  private save(): void {
    const s = this.collect();
    saveSettings(s);
    this.onSaved(s);
    this.statusEl.textContent = '已保存';
    this.statusEl.className = 'status ok';
  }

  private async test(): Promise<void> {
    this.statusEl.textContent = '正在测试……';
    this.statusEl.className = 'status';
    const err = await testConnection(this.collect());
    if (!err) {
      this.statusEl.textContent = '连接成功';
      this.statusEl.className = 'status ok';
    } else {
      this.statusEl.textContent = err.message;
      this.statusEl.className = 'status err';
    }
  }

  private clearKey(): void {
    this.apiKey.value = '';
    const s = this.collect();
    saveSettings(s);
    this.onSaved(s);
    this.statusEl.textContent = '已清除 Key';
    this.statusEl.className = 'status';
  }

  private clearMemory(): void {
    clearAllMemory();
    try {
      localStorage.removeItem('cbmu.memory.v1');
    } catch {
      // ignore
    }
    this.statusEl.textContent = '对话记忆已清除';
    this.statusEl.className = 'status';
  }

  private resetSave(): void {
    clearSave();
    this.statusEl.textContent = '存档已清除，刷新页面后重新开始';
    this.statusEl.className = 'status';
  }
}
