import * as THREE from 'three';

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  manager: THREE.LoadingManager;
}

export function createScene(container: HTMLElement, isMobile = false): SceneBundle {
  const manager = new THREE.LoadingManager();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14110d);
  scene.fog = new THREE.Fog(0x241f18, 12, 38);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 1.6, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
  // 手机端限制像素比到 1.5，减少 GPU 压力
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // 环境光 + 半球光，手机端提高基础亮度弥补缺失的聚光灯
  scene.add(new THREE.AmbientLight(0xfff2dd, isMobile ? 0.8 : 0.5));
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x8a7a5e, isMobile ? 0.6 : 0.45));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, manager };
}
