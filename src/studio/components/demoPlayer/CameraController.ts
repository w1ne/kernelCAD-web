// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
  private rotateStartAngle = 0;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  /** Nudge camera to keep large feature callouts readable without cropping the full artifact. */
  nudgeTo(featureId: string, durationMs: number, currentMs: number): void {
    const obj = this.scene.getObjectByName(featureId);
    if (!obj) return;
    // Feature objects are THREE.Group (each face is a child Mesh). Use Box3 to
    // compute the world-space bounding box, then derive a sphere from it.
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const radius = size.length() / 2;
    const distance = radius / Math.tan((this.camera.fov * Math.PI) / 180 / 2) / 0.4;
    const dir = this.camera.position.clone().sub(center).normalize();
    const currentDistance = this.camera.position.distanceTo(center);
    if (distance <= currentDistance) return;
    const target = center.clone().add(dir.multiplyScalar(currentDistance));
    this.nudgeFromPos = this.camera.position.clone();
    this.nudgeToPos = target;
    this.nudgeStartMs = currentMs;
    this.nudgeDurationMs = durationMs;
  }

  startRotate(durationMs: number, currentMs: number): void {
    this.rotateStartMs = currentMs;
    this.rotateDurationMs = durationMs;
    // Z-up convention: camera orbits in the XY plane at fixed Z height.
    this.rotateRadius = Math.hypot(this.camera.position.x, this.camera.position.y);
    this.rotateStartAngle = Math.atan2(this.camera.position.y, this.camera.position.x);
    this.rotateY = this.camera.position.z;
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
      const angle = this.rotateStartAngle + easeInOut(Math.min(1, t)) * Math.PI * 2;
      this.camera.position.set(
        Math.cos(angle) * this.rotateRadius,
        Math.sin(angle) * this.rotateRadius,
        this.rotateY,
      );
      this.camera.lookAt(0, 0, 0);
    }
  }
}
