import * as THREE from 'three';

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private nudgeStartMs = 0;
  private nudgeDurationMs = 0;
  private nudgeFromPos: THREE.Vector3 | null = null;
  private nudgeToPos: THREE.Vector3 | null = null;
  private rotateStartMs = -1;
  private rotateDurationMs = 0;
  private rotateRadius = 200;
  private rotateY = 80;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  /** Nudge camera to keep `featureId` ~40% of viewport diagonal over `durationMs`. */
  nudgeTo(featureId: string, durationMs: number, currentMs: number): void {
    const mesh = this.scene.getObjectByName(featureId) as THREE.Mesh | undefined;
    if (!mesh) return;
    mesh.geometry.computeBoundingSphere();
    const sphere = mesh.geometry.boundingSphere;
    if (!sphere) return;
    const center = sphere.center.clone().add(mesh.position);
    const radius = sphere.radius;
    const distance = radius / Math.tan((this.camera.fov * Math.PI) / 180 / 2) / 0.4;
    const dir = this.camera.position.clone().sub(center).normalize();
    const target = center.clone().add(dir.multiplyScalar(distance));
    this.nudgeFromPos = this.camera.position.clone();
    this.nudgeToPos = target;
    this.nudgeStartMs = currentMs;
    this.nudgeDurationMs = durationMs;
  }

  startRotate(durationMs: number, currentMs: number): void {
    this.rotateStartMs = currentMs;
    this.rotateDurationMs = durationMs;
    this.rotateRadius = this.camera.position.length();
  }

  update(currentMs: number): void {
    if (this.nudgeFromPos && this.nudgeToPos && currentMs >= this.nudgeStartMs) {
      const t = Math.min(1, (currentMs - this.nudgeStartMs) / this.nudgeDurationMs);
      const e = easeInOut(t);
      this.camera.position.lerpVectors(this.nudgeFromPos, this.nudgeToPos, e);
      this.camera.lookAt(0, 0, 0);
      if (t >= 1) {
        this.nudgeFromPos = null;
        this.nudgeToPos = null;
      }
    }
    if (this.rotateStartMs >= 0 && currentMs >= this.rotateStartMs) {
      const t = (currentMs - this.rotateStartMs) / this.rotateDurationMs;
      const angle = easeInOut(Math.min(1, t)) * Math.PI * 2;
      this.camera.position.set(
        Math.cos(angle) * this.rotateRadius,
        this.rotateY,
        Math.sin(angle) * this.rotateRadius,
      );
      this.camera.lookAt(0, 0, 0);
    }
  }
}
