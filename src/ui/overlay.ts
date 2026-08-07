import type { Exhibit } from '../config';

export class Overlay {
  private root = document.getElementById('overlay') as HTMLDivElement;
  private img = document.getElementById('ov-cover') as HTMLImageElement;
  private title = document.getElementById('ov-title') as HTMLElement;
  private author = document.getElementById('ov-author') as HTMLElement;
  private summary = document.getElementById('ov-summary') as HTMLElement;
  private content = document.getElementById('ov-content') as HTMLElement;
  private link = document.getElementById('ov-link') as HTMLAnchorElement;

  onClose?: () => void;

  constructor() {
    document.getElementById('ov-close')!.addEventListener('click', () => this.hide());
    document.getElementById('ov-bottom-close')?.addEventListener('click', () => this.hide());
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.hide();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
    // 拦截"阅读原文"点击，在新窗口打开，展厅不离开
    this.link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = this.link.getAttribute('href');
      if (!url || url === '#') return;
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) {
        // 弹窗被拦截，兜底在当前窗口打开
        window.location.href = url;
      }
    });
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(e: Exhibit) {
    this.img.onerror = () => {
      this.img.style.display = 'none';
    };
    this.img.onload = () => {
      this.img.style.display = '';
    };
    this.img.src = e.cover;
    this.img.alt = e.title;
    this.title.textContent = e.title;
    this.author.textContent = `作者：${e.author}`;
    this.summary.textContent = e.summary;
    this.content.textContent = e.content ?? '';
    this.content.style.display = e.content ? '' : 'none';
    if (e.link) {
      this.link.href = e.link;
      this.link.style.display = '';
    } else {
      this.link.style.display = 'none';
    }
    this.root.classList.remove('hidden');
  }

  hide() {
    if (!this.isOpen) return;
    this.root.classList.add('hidden');
    this.onClose?.();
  }
}
