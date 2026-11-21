import { el, button } from './dom';

export interface DialogCallbacks {
  onSend: (text: string) => void;
  onStop: () => void;
  onClose: () => void;
  onSettings: () => void;
}

export interface AssistantBubble {
  append: (text: string) => void;
  finish: () => void;
  fail: (text: string) => void;
}

export class DialogPanel {
  private panel: HTMLElement;
  private titleEl: HTMLElement;
  private subEl: HTMLElement;
  private bodyEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  private callbacks: DialogCallbacks | null = null;
  private busy = false;

  constructor(root: HTMLElement) {
    this.panel = el('div', 'panel');
    const head = el('div', 'dialog-head');
    const titleWrap = el('div', 'dialog-title');
    this.titleEl = el('span', '', 'NPC');
    this.subEl = el('small', '', '');
    titleWrap.append(this.titleEl, this.subEl);
    const headButtons = el('div', 'row');
    this.settingsBtn = button('设置', () => this.callbacks?.onSettings(), 'ui-btn ghost');
    this.closeBtn = button('关闭', () => this.closeRequested(), 'ui-btn ghost');
    headButtons.append(this.settingsBtn, this.closeBtn);
    head.append(titleWrap, headButtons);

    this.bodyEl = el('div', 'dialog-body');

    const inputRow = el('div', 'dialog-input');
    this.inputEl = el('input');
    this.inputEl.type = 'text';
    this.inputEl.maxLength = 500;
    this.inputEl.placeholder = '说点什么……';
    this.sendBtn = button('发送', () => this.send(), 'ui-btn primary');
    this.stopBtn = button('停止', () => this.callbacks?.onStop(), 'ui-btn ghost');
    this.stopBtn.style.display = 'none';
    inputRow.append(this.inputEl, this.sendBtn, this.stopBtn);

    this.panel.append(head, this.bodyEl, inputRow);
    root.append(this.panel);

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        this.send();
      }
    });
    this.panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.closeRequested();
      }
    });
  }

  get isOpen(): boolean {
    return this.panel.classList.contains('open');
  }

  open(title: string, subtitle: string, greeting: string | null, callbacks: DialogCallbacks): void {
    this.callbacks = callbacks;
    this.titleEl.textContent = title;
    this.subEl.textContent = subtitle;
    this.bodyEl.innerHTML = '';
    this.panel.classList.add('open');
    this.setBusy(false);
    if (greeting) this.addMessage('npc', greeting);
    this.inputEl.value = '';
    window.setTimeout(() => this.inputEl.focus(), 30);
  }

  close(): void {
    this.panel.classList.remove('open');
    this.setBusy(false);
    this.callbacks = null;
    this.inputEl.blur();
  }

  addMessage(kind: 'npc' | 'me' | 'sys', text: string): HTMLElement {
    const node = el('div', `msg ${kind}`, text);
    this.bodyEl.append(node);
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
    return node;
  }

  startAssistant(): AssistantBubble {
    const node = this.addMessage('npc', '');
    let buffer = '';
    return {
      append: (text: string) => {
        buffer += text;
        node.textContent = buffer;
        this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
      },
      finish: () => {
        this.setBusy(false);
        if (buffer.trim().length === 0) node.textContent = '……';
      },
      fail: (text: string) => {
        this.setBusy(false);
        this.addMessage('sys', text);
      },
    };
  }

  setBusy(busy: boolean): void {
    this.busy = busy;
    this.sendBtn.disabled = busy;
    this.inputEl.disabled = busy;
    this.stopBtn.style.display = busy ? '' : 'none';
    if (!busy) this.inputEl.focus();
  }

  private send(): void {
    if (this.busy || !this.callbacks) return;
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.inputEl.value = '';
    this.addMessage('me', text);
    this.setBusy(true);
    this.callbacks.onSend(text);
  }

  private closeRequested(): void {
    if (this.busy) this.callbacks?.onStop();
    const cb = this.callbacks;
    this.close();
    cb?.onClose();
  }
}
