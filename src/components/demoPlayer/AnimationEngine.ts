// src/components/demoPlayer/AnimationEngine.ts
import * as THREE from 'three';
import type { FeatureEvent } from '../../compute/featureEvents';
import type { FeatureKind } from '../../intent/types';

type TransitionKind = 'add' | 'boolean.cut' | 'boolean.fuse' | 'modifier' | 'transform' | 'fallback';

function classify(kind: FeatureKind, op?: string): TransitionKind {
  switch (kind) {
    case 'box': case 'cylinder': case 'sphere': case 'torus':
    case 'extrude': case 'revolve': case 'loft': case 'sweep':
    case 'importedMesh': case 'importedStep':
      return 'add';
    case 'hole': case 'cut':
      return 'boolean.cut';
    case 'boolean':
      return op === 'subtract' ? 'boolean.cut' : 'boolean.fuse';
    case 'fillet': case 'chamfer': case 'shell': case 'draft':
      return 'modifier';
    case 'mirror':
      return 'transform';
    case 'sketch': case 'constrainedSketch':
      return 'add'; // Tier 1 fallback per spec — fade-in
    default:
      return 'fallback';
  }
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

interface ActiveAnim {
  startMs: number;
  durationMs: number;
  resolve: () => void;
  step(elapsedNorm: number): void;
}

export class AnimationEngine {
  private scene: THREE.Scene;
  private active: ActiveAnim[] = [];
  private elapsedMs = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Returns a Promise that resolves when this event's transition has settled. */
  enqueue(event: FeatureEvent): Promise<void> {
    if (event.kind !== 'feature.compiled') {
      return Promise.resolve();
    }
    const cls = classify(event.featureKind, (event.shape as any)?.__op);
    const mesh = this.scene.getObjectByName(event.featureId) as THREE.Mesh | undefined;
    if (!mesh || !(mesh.material instanceof THREE.MeshStandardMaterial)) {
      return Promise.resolve();
    }
    const startMs = this.elapsedMs;

    if (cls === 'add' || cls === 'fallback') {
      mesh.material.transparent = true;
      mesh.material.opacity = 0;
      mesh.scale.setScalar(0.85);
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs,
          durationMs: cls === 'add' ? 500 : 400,
          resolve,
          step: (t) => {
            const e = easeOutCubic(t);
            (mesh.material as THREE.MeshStandardMaterial).opacity = e;
            mesh.scale.setScalar(0.85 + 0.15 * e);
          },
        });
      });
    }

    if (cls === 'boolean.cut') {
      mesh.material.transparent = true;
      mesh.material.opacity = 0;
      const cutterMesh = event.predecessors
        .map((pid) => this.scene.getObjectByName(pid) as THREE.Mesh | undefined)
        .find((m): m is THREE.Mesh => !!m && m.material instanceof THREE.MeshStandardMaterial);
      const cutterMat = cutterMesh?.material as THREE.MeshStandardMaterial | undefined;
      const originalColor = cutterMat ? cutterMat.color.clone() : null;
      if (cutterMat) cutterMat.transparent = true;
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs,
          durationMs: 600,
          resolve,
          step: (t) => {
            const elapsed = t * 600;
            // 0–150ms: cutter red flash
            if (cutterMat && originalColor) {
              if (elapsed < 150) {
                cutterMat.color.setRGB(1, 0.3, 0.3);
              } else {
                cutterMat.color.copy(originalColor);
              }
            }
            // 150–400ms: cutter fades out, carved fades in
            if (elapsed > 150) {
              const f = Math.min(1, (elapsed - 150) / 250);
              if (cutterMat) cutterMat.opacity = 1 - f;
              (mesh.material as THREE.MeshStandardMaterial).opacity = f;
            }
            // 400–600ms: hold at settled state
            if (t >= 1) {
              if (cutterMat) cutterMat.opacity = 0;
              (mesh.material as THREE.MeshStandardMaterial).opacity = 1;
            }
          },
        });
      });
    }

    // Other transitions added in later tasks; for now treat as instant settle.
    return Promise.resolve();
  }

  /** Advance internal clock by `dtMs`. Tweens active animations; resolves completed. */
  advance(dtMs: number): void {
    this.elapsedMs += dtMs;
    const stillActive: ActiveAnim[] = [];
    for (const a of this.active) {
      const t = Math.min(1, (this.elapsedMs - a.startMs) / a.durationMs);
      a.step(t);
      if (t >= 1) {
        a.resolve();
      } else {
        stillActive.push(a);
      }
    }
    this.active = stillActive;
  }

  isFrameReady(): boolean {
    return this.active.length === 0;
  }
}
