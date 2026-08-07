export class Hud {
  private loading = document.getElementById('loading') as HTMLDivElement;
  private bar = document.getElementById('loading-bar') as HTMLDivElement;
  private welcome = document.getElementById('welcome') as HTMLDivElement;
  private enterBtn = document.getElementById('enter-btn') as HTMLButtonElement;
  private crosshair = document.getElementById('crosshair') as HTMLDivElement;
  private hint = document.getElementById('hint') as HTMLDivElement;
  private actionTip = document.getElementById('action-tip') as HTMLDivElement;
  private resumeTip = document.getElementById('resume-tip') as HTMLDivElement;
  private infoBtn = document.getElementById('info-btn') as HTMLButtonElement;

  constructor() {
    // 法律弹窗交互
    const legalOverlay = document.getElementById('legal-overlay') as HTMLDivElement;
    const legalClose = document.getElementById('legal-close') as HTMLButtonElement;
    const infoLink = document.getElementById('info-link') as HTMLAnchorElement;

    const openLegal = () => { legalOverlay.classList.remove('hidden'); };
    const closeLegal = () => { legalOverlay.classList.add('hidden'); };

    infoLink?.addEventListener('click', openLegal);
    legalClose?.addEventListener('click', closeLegal);
    legalOverlay?.addEventListener('click', (e) => {
      if (e.target === legalOverlay) closeLegal();
    });
    this.infoBtn?.addEventListener('click', openLegal);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !legalOverlay.classList.contains('hidden')) closeLegal();
    });
  }

  setProgress(p: number) {
    this.bar.style.width = `${Math.round(p * 100)}%`;
  }

  showError(msg: string) {
    const sub = this.loading.querySelector('.loading-sub');
    if (sub) sub.textContent = msg;
  }

  /** 资源就绪：显示欢迎封面并绑定“进入展厅”按钮 */
  ready(isTouch: boolean, onEnter: () => void) {
    this.loading.classList.add('hidden');
    this.welcome.classList.remove('hidden');
    document.getElementById('hint-text-pc')?.classList.toggle('hidden', isTouch);
    document.getElementById('hint-text-touch')?.classList.toggle('hidden', !isTouch);
    this.enterBtn.disabled = false;
    this.enterBtn.textContent = '进入展厅';
    this.enterBtn.addEventListener(
      'click',
      () => {
        this.welcome.classList.add('hidden');
        this.crosshair.classList.remove('hidden');
        this.infoBtn?.classList.remove('hidden');
        this.hint.classList.remove('hidden');
        this.hint.innerHTML = isTouch
          ? '左侧摇杆移动 · 右侧滑动转视角'
          : 'W A S D / 方向键移动 · 鼠标转视角 · Esc 释放鼠标';
        onEnter();
      },
      { once: true },
    );
  }

  setActionTip(visible: boolean) {
    this.actionTip.classList.toggle('hidden', !visible);
  }

  showResume(visible: boolean) {
    this.resumeTip.classList.toggle('hidden', !visible);
  }
}
