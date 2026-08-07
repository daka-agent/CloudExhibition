import * as THREE from 'three';
import type { Exhibit } from '../config';

const HALL_W = 14; // 展厅宽度（x 方向）
const HALL_H = 4.2; // 层高
const PIC_W = 1.6; // 画面宽
const PIC_H = 1.15; // 画面高
const SPACING = 3.4; // 同侧墙面画框间距
const WALL_MARGIN = 3; // 端头留白

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Hall {
  bounds: Bounds;
  hitMeshes: THREE.Object3D[];
  setHovered(index: number): void;
  setDeskHovered(active: boolean): void;
}

/** 程序化木地板纹理，避免外部图片依赖 */
function makeWoodFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  const rowH = 64;
  for (let r = 0; r < c.height / rowH; r++) {
    let x = -(r % 2) * 128;
    while (x < c.width) {
      const shade = 0.85 + Math.random() * 0.3;
      g.fillStyle = `rgb(${Math.round(152 * shade)},${Math.round(106 * shade)},${Math.round(
        62 * shade,
      )})`;
      g.fillRect(x, r * rowH, 256, rowH);
      g.strokeStyle = 'rgba(62,40,20,0.85)';
      g.lineWidth = 3;
      g.strokeRect(x + 1, r * rowH + 1, 254, rowH - 2);
      x += 256;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 展签纹理：浅色卡片 + 标题 + 作者 */
function makeLabelTexture(title: string, author: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f7f1e4';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#b3a184';
  g.lineWidth = 6;
  g.strokeRect(4, 4, c.width - 8, c.height - 8);
  g.textAlign = 'center';
  g.fillStyle = '#3a3128';
  g.font = 'bold 46px "Microsoft YaHei", "PingFang SC", sans-serif';
  const t = title.length > 10 ? `${title.slice(0, 10)}…` : title;
  g.fillText(t, c.width / 2, 84);
  g.fillStyle = '#7d6c50';
  g.font = '30px "Microsoft YaHei", "PingFang SC", sans-serif';
  g.fillText(`作者：${author}`, c.width / 2, 146);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 封面加载失败时的程序化占位图 */
function makePlaceholderCover(e: Exhibit): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 420;
  const g = c.getContext('2d')!;
  let hash = 0;
  for (const ch of e.id) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, `hsl(${hash}, 42%, 62%)`);
  grad.addColorStop(1, `hsl(${(hash + 50) % 360}, 46%, 40%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,252,244,0.95)';
  g.font = 'bold 52px "Microsoft YaHei", "PingFang SC", sans-serif';
  g.fillText(e.title, c.width / 2, c.height / 2 - 10);
  g.font = '30px "Microsoft YaHei", "PingFang SC", sans-serif';
  g.fillText(e.author, c.width / 2, c.height / 2 + 46);
  g.fillStyle = 'rgba(255,252,244,0.6)';
  g.font = '22px "Microsoft YaHei", "PingFang SC", sans-serif';
  g.fillText('宿舍人物志 · 青春驻留地', c.width / 2, c.height - 30);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 创建留言簿 3D 讲台（走廊中央） */
function buildGuestbookDesk(isMobile: boolean): {
  group: THREE.Group;
  glowMat: THREE.MeshBasicMaterial;
} {
  const group = new THREE.Group();

  // 木质底座
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8b6914,
    roughness: 0.55,
    metalness: 0.08,
    emissive: isMobile ? 0x3a2510 : 0x000000,
    emissiveIntensity: isMobile ? 0.35 : 0,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.9), woodMat);
  body.position.y = 0.55;
  body.userData.isGuestbook = true;
  group.add(body);

  // 桌面板
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xa07830,
    roughness: 0.4,
    metalness: 0.12,
    emissive: isMobile ? 0x4a3010 : 0x000000,
    emissiveIntensity: isMobile ? 0.4 : 0,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 1.1), topMat);
  top.position.y = 1.1;
  top.userData.isGuestbook = true;
  group.add(top);

  // 翻开的书本 — 左页
  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xfaf3e0,
    roughness: 0.85,
    emissive: isMobile ? 0x5a4a2a : 0x000000,
    emissiveIntensity: isMobile ? 0.5 : 0,
  });
  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.7), pageMat);
  leftPage.position.set(-0.32, 1.18, 0);
  leftPage.rotation.x = -0.15;
  leftPage.userData.isGuestbook = true;
  group.add(leftPage);

  // 右页
  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.7), pageMat);
  rightPage.position.set(0.32, 1.18, 0);
  rightPage.rotation.x = 0.15;
  rightPage.userData.isGuestbook = true;
  group.add(rightPage);

  // 书脊
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x6d4c1e, roughness: 0.5 }),
  );
  spine.position.set(0, 1.16, 0);
  spine.rotation.z = Math.PI / 2;
  group.add(spine);

  // 羽毛笔笔座
  const quillHolder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.15, 6),
    new THREE.MeshStandardMaterial({
      color: 0x4a3520,
      roughness: 0.6,
      emissive: isMobile ? 0x1a1008 : 0x000000,
      emissiveIntensity: isMobile ? 0.3 : 0,
    }),
  );
  quillHolder.position.set(0.7, 1.16, -0.25);
  group.add(quillHolder);

  // 羽毛
  const feather = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.4, 6),
    new THREE.MeshStandardMaterial({
      color: 0xddccaa,
      roughness: 0.7,
      emissive: isMobile ? 0x4a3a1a : 0x000000,
      emissiveIntensity: isMobile ? 0.5 : 0,
    }),
  );
  feather.position.set(0.7, 1.38, -0.25);
  feather.rotation.x = 0.3;
  group.add(feather);

  // 底框装饰
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x6f4a26,
    roughness: 0.5,
    metalness: 0.1,
    emissive: isMobile ? 0x2a1808 : 0x000000,
    emissiveIntensity: isMobile ? 0.3 : 0,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 1.2), baseMat);
  base.position.y = 0.03;
  group.add(base);

  // 金色发光环（提示可点击）
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xd8a850,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
  });
  const glowRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 32), glowMat);
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 1.22;
  group.add(glowRing);

  return { group, glowMat };
}

export function buildHall(
  scene: THREE.Scene,
  exhibits: Exhibit[],
  manager: THREE.LoadingManager,
  isMobile = false,
): Hall {
  const perWall = Math.max(1, Math.ceil(exhibits.length / 2));
  const L = Math.max(12, SPACING * (perWall - 1) + WALL_MARGIN * 2);

  // 地板
  const floorTex = makeWoodFloorTexture();
  floorTex.repeat.set(HALL_W / 3, L / 3);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL_W, L),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 天花板
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL_W, L),
    new THREE.MeshStandardMaterial({ color: isMobile ? 0xf8f3e8 : 0xf2ecdf, roughness: 0.95 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = HALL_H;
  scene.add(ceiling);

  // 四面墙
  const wallMat = new THREE.MeshStandardMaterial({
    color: isMobile ? 0xefe7d8 : 0xe6ddcc,
    roughness: 0.92,
  });
  const mkWall = (w: number, x: number, z: number, rotY: number) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, HALL_H), wallMat);
    wall.position.set(x, HALL_H / 2, z);
    wall.rotation.y = rotY;
    scene.add(wall);
  };
  mkWall(L, -HALL_W / 2, 0, Math.PI / 2); // 左墙，面朝 +x
  mkWall(L, HALL_W / 2, 0, -Math.PI / 2); // 右墙，面朝 -x
  mkWall(HALL_W, 0, -L / 2, 0); // 尽头墙，面朝 +z
  mkWall(HALL_W, 0, L / 2, Math.PI); // 入口墙，面朝 -z

  // 天花板灯带 + 暖色点光源补光（手机端跳过点光源以减少 GPU 负担）
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.06, L - 1),
    new THREE.MeshStandardMaterial({
      color: 0xfff6e2,
      emissive: 0xfff0cf,
      emissiveIntensity: isMobile ? 1.8 : 1.1,
    }),
  );
  strip.position.set(0, HALL_H - 0.04, 0);
  scene.add(strip);
  if (!isMobile) {
    for (const z of [-L / 4, L / 4]) {
      const p = new THREE.PointLight(0xffe6bf, 18, 26, 1.8);
      p.position.set(0, HALL_H - 0.5, z);
      scene.add(p);
    }
  }

  // 留言簿讲台（走廊中央）
  const { group: deskGroup, glowMat: deskGlowMat } = buildGuestbookDesk(isMobile);
  deskGroup.position.set(0, 0, -L / 6);
  scene.add(deskGroup);

  // 画框沿左右两面长墙交替均匀排布
  const loader = new THREE.TextureLoader(manager);
  const hitMeshes: THREE.Object3D[] = [];
  const entries: { group: THREE.Group; frameMat: THREE.MeshStandardMaterial }[] = [];

  exhibits.forEach((e, i) => {
    const side = i % 2 === 0 ? -1 : 1; // -1 左墙，1 右墙
    const k = Math.floor(i / 2);
    const z = -((perWall - 1) * SPACING) / 2 + k * SPACING;
    const x = side * (HALL_W / 2 - 0.06);

    const group = new THREE.Group();
    group.position.set(x, 1.6, z);
    group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x6f4a26,
      roughness: 0.55,
      metalness: 0.1,
      // 手机端用自发光模拟"被灯光照亮"的效果，替代聚光灯
      emissive: isMobile ? 0x3a2510 : 0x000000,
      emissiveIntensity: isMobile ? 0.35 : 0,
    });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(PIC_W + 0.18, PIC_H + 0.18, 0.07),
      frameMat,
    );

    const coverMat = new THREE.MeshStandardMaterial({
      map: makePlaceholderCover(e),
      roughness: 0.9,
      // 手机端给画布加一点自发光，让封面在没有聚光灯的情况下依然清晰可见
      emissive: isMobile ? 0x2a1a08 : 0x000000,
      emissiveIntensity: isMobile ? 0.3 : 0,
    });
    loader.load(
      e.cover,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        coverMat.map = tex;
        coverMat.needsUpdate = true;
      },
      undefined,
      () => {
        console.warn(`封面加载失败，使用占位图: ${e.id} ${e.title}`);
      },
    );
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(PIC_W, PIC_H), coverMat);
    pic.position.z = 0.04;

    frame.userData.exhibitIndex = i;
    pic.userData.exhibitIndex = i;
    group.add(frame, pic);

    // 展签
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.3),
      new THREE.MeshStandardMaterial({
        map: makeLabelTexture(e.title, e.author),
        roughness: 0.85,
      }),
    );
    label.position.set(0, -(PIC_H / 2 + 0.28), 0.02);
    group.add(label);

    scene.add(group);
    entries.push({ group, frameMat });
    hitMeshes.push(frame, pic);

    // 每幅画配一盏暖色射灯（手机端跳过，用 frame 自发光替代）
    if (!isMobile) {
      const spot = new THREE.SpotLight(0xffe9c4, 30, 9, Math.PI / 7, 0.45, 1.6);
      spot.position.set(x - side * 1.6, HALL_H - 0.6, z);
      spot.target.position.set(x, 1.6, z);
      scene.add(spot, spot.target);
    }
  });

  let hovered = -1;
  // 保存每幅画的默认自发光，供 setHovered 恢复使用
  const defaultEmissive = isMobile ? 0x3a2510 : 0x000000;
  const defaultIntensity = isMobile ? 0.35 : 0;
  function setHovered(index: number) {
    if (index === hovered) return;
    entries.forEach((en, i) => {
      const active = i === index;
      en.group.scale.setScalar(active ? 1.045 : 1);
      en.frameMat.emissive.setHex(active ? 0x7a4a12 : defaultEmissive);
      en.frameMat.emissiveIntensity = active ? 0.6 : defaultIntensity;
    });
    hovered = index;
  }

  // 将留言台可点击网格加入 hitMeshes
  deskGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.isGuestbook) {
      hitMeshes.push(child);
    }
  });

  // 留言台高亮
  let deskHovered = false;
  function setDeskHovered(active: boolean) {
    if (active === deskHovered) return;
    deskGlowMat.opacity = active ? 0.7 : 0.35;
    deskGroup.scale.setScalar(active ? 1.03 : 1);
    deskHovered = active;
  }

  return {
    bounds: {
      minX: -HALL_W / 2 + 0.7,
      maxX: HALL_W / 2 - 0.7,
      minZ: -L / 2 + 0.7,
      maxZ: L / 2 - 0.7,
    },
    hitMeshes,
    setHovered,
    setDeskHovered,
  };
}
