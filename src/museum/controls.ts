import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { Bounds } from './hall';

const EYE_HEIGHT = 1.6;
const SPEED = 3.2;
const JOY_RADIUS = 48;

export class RoamControls {
  readonly isTouch: boolean;
  enabled = false;
  onLockChange?: (locked: boolean) => void;

  private plc: PointerLockControls | null = null;
  private keys = new Set<string>();
  private joy = new THREE.Vector2();
  private yaw = 0;
  private pitch = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private dom: HTMLElement,
    private bounds: Bounds,
  ) {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    camera.rotation.order = 'YXZ';
    if (this.isTouch) this.setupTouch();
    else this.setupDesktop();
  }

  /** 是否处于可漫游状态（PC 需锁定鼠标） */
  get active(): boolean {
    return this.enabled && (this.isTouch || (this.plc?.isLocked ?? false));
  }

  get lockedState(): boolean {
    return this.plc?.isLocked ?? false;
  }

  lock() {
    this.plc?.lock();
  }

  unlock() {
    this.plc?.unlock();
  }

  private setupDesktop() {
    this.plc = new PointerLockControls(this.camera, this.dom);
    this.plc.addEventListener('lock', () => this.onLockChange?.(true));
    this.plc.addEventListener('unlock', () => this.onLockChange?.(false));
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private setupTouch() {
    // 左侧虚拟摇杆
    const base = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    if (base && knob) {
      base.style.display = 'block';
      let joyId: number | null = null;
      const setKnob = (dx: number, dy: number) => {
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      base.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          joyId = e.changedTouches[0].identifier;
        },
        { passive: false },
      );
      base.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier !== joyId) continue;
            const rect = base.getBoundingClientRect();
            let dx = t.clientX - (rect.left + rect.width / 2);
            let dy = t.clientY - (rect.top + rect.height / 2);
            const len = Math.hypot(dx, dy);
            if (len > JOY_RADIUS) {
              dx = (dx / len) * JOY_RADIUS;
              dy = (dy / len) * JOY_RADIUS;
            }
            this.joy.set(dx / JOY_RADIUS, dy / JOY_RADIUS);
            setKnob(dx, dy);
          }
        },
        { passive: false },
      );
      const joyEnd = (e: TouchEvent) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === joyId) {
            joyId = null;
            this.joy.set(0, 0);
            setKnob(0, 0);
          }
        }
      };
      base.addEventListener('touchend', joyEnd);
      base.addEventListener('touchcancel', joyEnd);
    }

    // 右侧滑动转视角
    let lookId: number | null = null;
    let lx = 0;
    let ly = 0;
    this.dom.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      if (lookId === null) {
        lookId = t.identifier;
        lx = t.clientX;
        ly = t.clientY;
      }
    });
    this.dom.addEventListener('touchmove', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== lookId) continue;
        this.yaw -= (t.clientX - lx) * 0.0042;
        this.pitch -= (t.clientY - ly) * 0.0042;
        this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
        this.camera.rotation.set(this.pitch, this.yaw, 0);
        lx = t.clientX;
        ly = t.clientY;
      }
    });
    const lookEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === lookId) lookId = null;
      }
    };
    this.dom.addEventListener('touchend', lookEnd);
    this.dom.addEventListener('touchcancel', lookEnd);
  }

  update(dt: number) {
    if (!this.active) return;
    let f = 0;
    let r = 0;
    if (this.isTouch) {
      f = -this.joy.y;
      r = this.joy.x;
    } else {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) f += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) f -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) r += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) r -= 1;
    }
    if (f === 0 && r === 0) return;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));

    const move = new THREE.Vector3().addScaledVector(dir, f).addScaledVector(right, r);
    if (move.lengthSq() > 1) move.normalize();

    const p = this.camera.position;
    p.addScaledVector(move, SPEED * dt);
    p.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, p.x));
    p.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, p.z));
    p.y = EYE_HEIGHT;
  }
}
