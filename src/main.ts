import * as THREE from 'three';
import './style.css';
import { loadExhibits } from './config';
import { createScene } from './museum/scene';
import { buildHall } from './museum/hall';
import { RoamControls } from './museum/controls';
import { Overlay } from './ui/overlay';
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

  // 手机竖屏提示
  if (isMobile) {
    const rotateHint = document.getElementById('rotate-hint')!;
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      rotateHint.classList.toggle('hidden', !isPortrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
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
  const raycaster = new THREE.Raycaster();
  raycaster.far = 9;
  const screenCenter = new THREE.Vector2(0, 0);
  let hovered = -1;

  let entered = false;
  const enter = () => {
    controls.enabled = true;
    hasEnteredHall = true;
    updateVisitorDisplay();
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
    if (!controls.isTouch && controls.enabled) controls.lock();
  };

  controls.onLockChange = (locked) => {
    if (controls.isTouch) return;
    hud.showResume(!locked && controls.enabled && !overlay.isOpen);
  };

  renderer.domElement.addEventListener('click', () => {
    if (!controls.enabled || overlay.isOpen) return;
    if (controls.isTouch) {
      if (hovered >= 0) overlay.show(exhibits[hovered]);
      return;
    }
    if (controls.lockedState) {
      if (hovered >= 0) {
        controls.unlock();
        overlay.show(exhibits[hovered]);
      }
    } else {
      controls.lock();
    }
  });

  const clock = new THREE.Clock();
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    controls.update(dt);

    let hit = -1;
    if (controls.enabled && !overlay.isOpen && (controls.isTouch || controls.lockedState)) {
      raycaster.setFromCamera(screenCenter, camera);
      const hits = raycaster.intersectObjects(hall.hitMeshes, false);
      if (hits.length > 0) {
        hit = hits[0].object.userData.exhibitIndex as number;
      }
    }
    hovered = hit;
    hall.setHovered(hit);
    hud.setActionTip(hit >= 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
}

main().catch((err: unknown) => {
  console.error(err);
  new Hud().showError('加载失败，请刷新重试');
});
