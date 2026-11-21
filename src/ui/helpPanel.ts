import { button, el } from './dom';

export class HelpPanel {
  private backdrop: HTMLElement;
  private modal: HTMLElement;

  constructor(root: HTMLElement, onOpenSettings: () => void) {
    this.backdrop = el('div', 'modal-backdrop');
    this.modal = el('div', 'modal');
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-label', '帮助');

    const h = el('h2', '', '怎么玩');
    const body = el('div', 'hint');
    body.innerHTML = [
      '<p><b>移动</b>：WASD / 方向键；手机上用左下角虚拟摇杆。</p>',
      '<p><b>交谈</b>：靠近 NPC，按 E 或点右下角按钮；也可直接点 NPC。</p>',
      '<p><b>进楼</b>：走到门口自动进入；室内走到门口自动出去。</p>',
      '<p><b>AI 对话</b>：先在「设置」里填写 OpenAI 兼容接口的 Base URL、模型和 API Key；不填也能玩，NPC 会说预设台词。</p>',
      '<p><b>存档</b>：切换地图和每 30 秒自动保存，也可点右上角「存档」。</p>',
      '<p>校园布局依据公开资料整理：南门—礼仪广场—中轴石桥—图情信息中心一线，四大书院（临江、松林、莲池、甘露）与四大生活园（雅、可、和、瑞）。</p>',
      '<p><b>校园背景</b>：学校前身是1951年的西南区川北医士学校，临江校区于2025年10月启用，首批3500余名2025级新生入驻。校训“敬业、博爱、求是、创新”，校医院、附属医院与各院系均已融入 NPC 的对话知识。</p>',
      '<p>本作为学习作品，地图为示意性复现，非真实比例；资料来自学校官网与公开报道。</p>',
    ].join('');

    const row = el('div', 'row');
    row.append(
      button('去设置 AI', () => {
        this.close();
        onOpenSettings();
      }, 'ui-btn primary'),
      button('关闭', () => this.close(), 'ui-btn ghost'),
    );

    this.modal.append(h, body, row);
    this.backdrop.append(this.modal);
    root.append(this.backdrop);

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
  }

  open(): void {
    this.backdrop.classList.add('open');
  }

  close(): void {
    this.backdrop.classList.remove('open');
  }
}
