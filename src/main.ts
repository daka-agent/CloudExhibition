import * as THREE from 'three';
import './style.css';
import { loadExhibits } from './config';
import { createScene } from './museum/scene';
import { buildHall } from './museum/hall';
import { RoamControls } from './museum/controls';
import { Overlay } from './ui/overlay';
import { GuestbookOverlay } from './ui/guestbook-overlay';
import { Hud } from './ui/hud';
import { fetchVisitorCount } from './visitor-counter';

async function main() {
  const container = document.getElementById('app')!;
  const hud = new Hud();
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // 访客计数（与展厅加载并行执行）
  let visitorCount: number | null = null;
  let hasEnteredHall = false;
  const updateVisitorDisplay = () => {
    if (visitorCount === null) return;
    const fmt = visitorCount.toLocaleString('zh-CN');
    const welcomeEl = document.getElementById('visitor-count');
    if (welcomeEl) {
      welcomeEl.innerHTML = `✦ 累计访客 <span class="vc-num">${fmt}</span> 人次`;
      welcomeEl.classList.remove('hidden');
    }
    if (hasEnteredHall) {
      const badge = document.getElementById('visitor-badge');
      if (badge) {
        badge.textContent = `访客 ${fmt}`;
        badge.classList.remove('hidden');
      }
    }
  };
  fetchVisitorCount().then((count) => {
    visitorCount = count;
    updateVisitorDisplay();
  });

  // WebGL 支持检测
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
  if (!gl) {
    hud.showError('您的浏览器不支持 WebGL，无法浏览 3D 展厅');
    return;
  }

  // 手机竖屏提示（可跳过，微信兼容）
  if (isMobile) {
    const rotateHint = document.getElementById('rotate-hint')!;
    const rotateContinue = document.getElementById('rotate-continue')!;
    let rotateDismissed = sessionStorage.getItem('rotate-dismissed') === '1';

    const checkOrientation = () => {
      if (rotateDismissed) {
        rotateHint.classList.add('hidden');
        return;
      }
      const isPortrait = window.innerHeight > window.innerWidth;
      rotateHint.classList.toggle('hidden', !isPortrait);
    };

    if (!rotateDismissed) {
      checkOrientation();
      window.addEventListener('resize', checkOrientation);
      window.addEventListener('orientationchange', () => {
        // 微信浏览器可能延迟触发，延迟再检查一次
        setTimeout(checkOrientation, 300);
        setTimeout(checkOrientation, 800);
      });
      // 微信兼容兜底：1 秒轮询，检测到横屏或跳过后自动停止
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        if (rotateDismissed || pollCount > 10) {
          clearInterval(pollInterval);
          return;
        }
        checkOrientation();
      }, 1000);
    }

    rotateContinue.addEventListener('click', () => {
      rotateDismissed = true;
      sessionStorage.setItem('rotate-dismissed', '1');
      rotateHint.classList.add('hidden');
    });
  }

  const { scene, camera, renderer, manager } = createScene(container, isMobile);
  manager.onProgress = (_url, loaded, total) => {
    hud.setProgress(total > 0 ? loaded / total : 0);
  };
  manager.onError = (url) => {
    console.warn(`资源加载失败: ${url}`);
  };

  const exhibits = await loadExhibits();
  const hall = buildHall(scene, exhibits, manager, isMobile);
  camera.position.set(0, 1.6, hall.bounds.maxZ - 1.5);

  const controls = new RoamControls(camera, renderer.domElement, hall.bounds);
  const overlay = new Overlay();
  const gbOverlay = new GuestbookOverlay();
  const raycaster = new THREE.Raycaster();
  raycaster.far = 9;
  const screenCenter = new THREE.Vector2(0, 0);
  let hitExhibit = -1;
  let hitGuestbook = false;
  let prevHitExhibit = -1;
  let prevHitGuestbook = false;

  let entered = false;
  const enter = () => {
    controls.enabled = true;
    hasEnteredHall = true;
    updateVisitorDisplay();
    // 提前加载留言数据，避免打开留言簿时等待
    gbOverlay.preload();
    if (!controls.isTouch) controls.lock();
  };
  const tryReady = () => {
    if (entered) return;
    entered = true;
    hud.ready(controls.isTouch, enter);
  };

  // 贴图全部就绪后展示欢迎封面；若无任何展品则直接就绪
  if (exhibits.length > 0) {
    manager.onLoad = () => tryReady();
    // 超时兜底：8 秒后无论如何都允许进入展厅
    setTimeout(tryReady, 8000);
  } else {
    tryReady();
  }

  overlay.onClose = () => {
    if (!controls.isTouch && controls.enabled && !gbOverlay.isOpen) controls.lock();
  };

  gbOverlay.onClose = () => {
    if (!controls.isTouch && controls.enabled) controls.lock();
  };

  controls.onLockChange = (locked) => {
    if (controls.isTouch) return;
    hud.showResume(!locked && controls.enabled && !overlay.isOpen && !gbOverlay.isOpen);
  };

  renderer.domElement.addEventListener('click', () => {
    if (!controls.enabled || overlay.isOpen || gbOverlay.isOpen) return;
    if (controls.isTouch) {
      if (hitGuestbook) { gbOverlay.open(); return; }
      if (hitExhibit >= 0) overlay.show(exhibits[hitExhibit]);
      return;
    }
    if (controls.lockedState) {
      if (hitGuestbook) {
        controls.unlock();
        gbOverlay.open();
      } else if (hitExhibit >= 0) {
        controls.unlock();
        overlay.show(exhibits[hitExhibit]);
      }
    } else {
      controls.lock();
    }
  });

  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    controls.update(dt);

    let nextExhibit = -1;
    let nextGuestbook = false;
    if (controls.enabled && !overlay.isOpen && !gbOverlay.isOpen && (controls.isTouch || controls.lockedState)) {
      raycaster.setFromCamera(screenCenter, camera);
      const hits = raycaster.intersectObjects(hall.hitMeshes, false);
      if (hits.length > 0) {
        const obj = hits[0].object;
        if (obj.userData.isGuestbook) {
          nextGuestbook = true;
        } else {
          nextExhibit = obj.userData.exhibitIndex as number;
        }
      }
    }

    if (nextExhibit !== prevHitExhibit) {
      hall.setHovered(nextExhibit);
      prevHitExhibit = nextExhibit;
    }
    if (nextGuestbook !== prevHitGuestbook) {
      hall.setDeskHovered(nextGuestbook);
      prevHitGuestbook = nextGuestbook;
    }
    hitExhibit = nextExhibit;
    hitGuestbook = nextGuestbook;
    hud.setActionTip(hitExhibit >= 0 || hitGuestbook, hitGuestbook);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
}

main().catch((err: unknown) => {
  console.error(err);
  new Hud().showError('加载失败，请刷新重试');
});
