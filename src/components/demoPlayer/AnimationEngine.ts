// src/components/demoPlayer/AnimationEngine.ts
import * as THREE from 'three';
import type { FeatureEvent } from '../../compute/featureEvents';
import type { FeatureKind } from '../../intent/types';

type TransitionKind = 'add' | 'boolean.cut' | 'boolean.fuse' | 'modifier' | 'transform' | 'fallback';

function classify(kind: FeatureKind, op?: 'subtract' | 'union' | 'intersect'): TransitionKind {
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
      return 'add';
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

interface GroupRefs {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  mats: THREE.MeshPhongMaterial[];
  origColors: THREE.Color[];
}

function findGroup(scene: THREE.Scene, name: string): GroupRefs | null {
  const obj = scene.getObjectByName(name);
  if (!(obj instanceof THREE.Group)) return null;
  const meshes = obj.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
  const mats: THREE.MeshPhongMaterial[] = [];
  const origColors: THREE.Color[] = [];
  for (const m of meshes) {
    if (m.material instanceof THREE.MeshPhongMaterial) {
      mats.push(m.material);
      origColors.push(m.material.color.clone());
    }
  }
  return { group: obj, meshes, mats, origColors };
}

function setOpacity(refs: GroupRefs, value: number): void {
  for (const m of refs.mats) {
    m.transparent = true;
    m.opacity = value;
  }
}

function setColor(refs: GroupRefs, r: number, g: number, b: number): void {
  for (const m of refs.mats) m.color.setRGB(r, g, b);
}

function restoreColors(refs: GroupRefs): void {
  for (let i = 0; i < refs.mats.length; i++) {
    refs.mats[i].color.copy(refs.origColors[i]);
  }
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
    if (event.kind !== 'feature.compiled') return Promise.resolve();
    const cls = classify(event.featureKind, event.op);
    const target = findGroup(this.scene, event.featureId);
    if (!target) return Promise.resolve();

    const startMs = this.elapsedMs;

    if (cls === 'add' || cls === 'fallback' || cls === 'transform') {
      setOpacity(target, 0);
      target.group.scale.setScalar(0.85);
      const dur = cls === 'add' ? 500 : (cls === 'transform' ? 500 : 400);
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: dur, resolve,
          step: (t) => {
            const e = easeOutCubic(t);
            setOpacity(target, e);
            target.group.scale.setScalar(0.85 + 0.15 * e);
          },
        });
      });
    }

    if (cls === 'boolean.cut') {
      setOpacity(target, 0);
      const predGroups = event.predecessors
        .map((pid) => findGroup(this.scene, pid))
        .filter((g): g is GroupRefs => g !== null);
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: 600, resolve,
          step: (t) => {
            const elapsed = t * 600;
            // 0–150ms: cutters flash red
            if (elapsed < 150) {
              for (const pg of predGroups) setColor(pg, 1, 0.3, 0.3);
            } else {
              for (const pg of predGroups) restoreColors(pg);
            }
            // 150–400ms: cutters fade out, carved fades in
            if (elapsed > 150) {
              const f = Math.min(1, (elapsed - 150) / 250);
              for (const pg of predGroups) setOpacity(pg, 1 - f);
              setOpacity(target, f);
            }
            if (t >= 1) {
              for (const pg of predGroups) setOpacity(pg, 0);
              setOpacity(target, 1);
            }
          },
        });
      });
    }

    if (cls === 'boolean.fuse') {
      setOpacity(target, 0);
      const predGroups = event.predecessors
        .map((pid) => findGroup(this.scene, pid))
        .filter((g): g is GroupRefs => g !== null);
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: 500, resolve,
          step: (t) => {
            const elapsed = t * 500;
            if (elapsed < 150) {
              for (const pg of predGroups) setColor(pg, 1, 0.9, 0.4);
            } else {
              for (const pg of predGroups) restoreColors(pg);
            }
            if (elapsed > 150) {
              const f = easeOutCubic(Math.min(1, (elapsed - 150) / 350));
              for (const pg of predGroups) setOpacity(pg, 1 - f);
              setOpacity(target, f);
            }
            if (t >= 1) {
              for (const pg of predGroups) setOpacity(pg, 0);
              setOpacity(target, 1);
            }
          },
        });
      });
    }

    if (cls === 'modifier') {
      setOpacity(target, 0);
      const predGroups = event.predecessors
        .map((pid) => findGroup(this.scene, pid))
        .filter((g): g is GroupRefs => g !== null);
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: 400, resolve,
          step: (t) => {
            const elapsed = t * 400;
            if (elapsed < 150) {
              setColor(target, 0.4, 0.9, 1);
            } else {
              restoreColors(target);
            }
            if (elapsed > 150) {
              const f = (elapsed - 150) / 250;
              setOpacity(target, 0.7 + 0.3 * f);
              for (const pg of predGroups) setOpacity(pg, 1 - f);
            }
            if (t >= 1) {
              setOpacity(target, 1);
              for (const pg of predGroups) setOpacity(pg, 0);
            }
          },
        });
      });
    }

    return Promise.resolve();
  }

  /** Advance internal clock by `dtMs`. Tweens active animations; resolves completed. */
  advance(dtMs: number): void {
    this.elapsedMs += dtMs;
    const stillActive: ActiveAnim[] = [];
    for (const a of this.active) {
      const t = Math.min(1, (this.elapsedMs - a.startMs) / a.durationMs);
      a.step(t);
      if (t >= 1) a.resolve();
      else stillActive.push(a);
    }
    this.active = stillActive;
  }

  isFrameReady(): boolean {
    return this.active.length === 0;
  }
}
