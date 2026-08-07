import { fetchMessages, postMessage, type Message } from '../guestbook/guestbook';

export class GuestbookOverlay {
  private root = document.getElementById('gb-overlay') as HTMLDivElement;
  private list = document.getElementById('gb-list') as HTMLDivElement;
  private form = document.getElementById('gb-form') as HTMLFormElement;
  private nickInput = document.getElementById('gb-nickname') as HTMLInputElement;
  private msgTextarea = document.getElementById('gb-message') as HTMLTextAreaElement;
  private submitBtn = document.getElementById('gb-submit') as HTMLButtonElement;
  private statusEl = document.getElementById('gb-status') as HTMLDivElement;
  private nickCount = document.getElementById('gb-nick-count') as HTMLSpanElement;
  private msgCount = document.getElementById('gb-msg-count') as HTMLSpanElement;

  private cachedMessages: Message[] | null = null;
  private preloadPromise: Promise<Message[]> | null = null;

  onClose?: () => void;

  constructor() {
    // 关闭事件
    document.getElementById('gb-close')!.addEventListener('click', () => this.hide());
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.hide();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.hide();
    });

    // 提交
    this.submitBtn.addEventListener('click', () => this.handleSubmit());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // 实时字数统计
    this.nickInput.addEventListener('input', () => this.updateCounters());
    this.msgTextarea.addEventListener('input', () => this.updateCounters());
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** 进入展厅时调用，提前加载留言数据 */
  preload() {
    if (this.preloadPromise) return;
    this.preloadPromise = fetchMessages(50);
    this.preloadPromise.then((msgs) => {
      this.cachedMessages = msgs;
      // 如果弹窗已打开，立即刷新列表
      if (this.isOpen) this.renderMessages(msgs);
    });
  }

  async open() {
    this.root.classList.remove('hidden');
    this.statusEl.textContent = '';
    this.statusEl.className = 'gb-status';
    this.clearForm();
    // 有缓存直接渲染，无缓存等预加载
    if (this.cachedMessages !== null) {
      this.renderMessages(this.cachedMessages);
    } else {
      this.list.innerHTML = '<div class="gb-loading">加载留言中…</div>';
    }
  }

  hide() {
    if (!this.isOpen) return;
    this.root.classList.add('hidden');
    this.onClose?.();
  }

  private renderMessages(msgs: Message[]) {
    if (msgs.length === 0) {
      this.list.innerHTML = '<div class="gb-empty">暂无留言，快来写下第一条吧！</div>';
      return;
    }
    this.list.innerHTML = msgs.map((m) => this.renderMessage(m)).join('');
  }

  private renderMessage(m: Message): string {
    const time = formatRelativeTime(m.created_at);
    const safeNick = escapeHtml(m.nickname);
    const safeMsg = escapeHtml(m.message).replace(/\n/g, '<br>');
    return `
      <div class="gb-item">
        <div class="gb-item-head">
          <span class="gb-item-nick">${safeNick}</span>
          <span class="gb-item-time">${time}</span>
        </div>
        <div class="gb-item-body">${safeMsg}</div>
      </div>`;
  }

  private async handleSubmit() {
    const nickname = this.nickInput.value;
    const message = this.msgTextarea.value;

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = '发送中…';
    this.statusEl.textContent = '';
    this.statusEl.className = 'gb-status';

    const result = await postMessage(nickname, message);

    if (result.ok) {
      this.statusEl.textContent = '留言成功！';
      this.statusEl.className = 'gb-status gb-success';
      this.clearForm();
      // 重新拉取最新留言列表
      const msgs = await fetchMessages(50);
      this.cachedMessages = msgs;
      this.renderMessages(msgs);
      this.list.scrollTop = 0;
    } else {
      this.statusEl.textContent = result.error ?? '留言失败';
      this.statusEl.className = 'gb-status gb-error';
    }

    this.submitBtn.disabled = false;
    this.submitBtn.textContent = '提交留言';
  }

  private clearForm() {
    this.nickInput.value = '';
    this.msgTextarea.value = '';
    this.updateCounters();
  }

  private updateCounters() {
    this.nickCount.textContent = `${this.nickInput.value.length}/20`;
    this.msgCount.textContent = `${this.msgTextarea.value.length}/500`;
  }
}

// -------------------- 工具函数 --------------------
function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;

  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
