// src/components/demoPlayer/AnimationEngine.ts
import * as THREE from 'three';
import type { FeatureEvent } from '../../../modeling/compute/featureEvents';
import type { FeatureKind } from '../../../shared/intent/types';

type TransitionKind = 'add' | 'boolean.cut' | 'boolean.fuse' | 'modifier' | 'transform' | 'fallback';

function classify(kind: FeatureKind, op?: 'subtract' | 'union' | 'intersect'): TransitionKind {
  switch (kind) {
    case 'box': case 'cylinder': case 'sphere': case 'torus':
    case 'extrude': case 'revolve': case 'loft': case 'sweep':
    case 'importedMesh': case 'importedStep': case 'sdfMaterialize':
      return 'add';
    case 'hole': case 'holes': case 'cutout':
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
  mats: THREE.MeshStandardMaterial[];
  origColors: THREE.Color[];
}

function findGroup(scene: THREE.Scene, name: string): GroupRefs | null {
  const obj = scene.getObjectByName(name);
  if (!(obj instanceof THREE.Group)) return null;
  const meshes = obj.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
  const mats: THREE.MeshStandardMaterial[] = [];
  const origColors: THREE.Color[] = [];
  for (const m of meshes) {
    if (m.material instanceof THREE.MeshStandardMaterial) {
      mats.push(m.material);
      origColors.push(m.material.color.clone());
    }
  }
  return { group: obj, meshes, mats, origColors };
}

// Fix 5: DRY predecessor collection; Fix 3: warn on missing predecessor
function collectPredGroups(scene: THREE.Scene, ids: readonly string[]): GroupRefs[] {
  const out: GroupRefs[] = [];
  for (const id of ids) {
    const g = findGroup(scene, id);
    if (g) {
      out.push(g);
    } else {
      console.warn(`AnimationEngine: predecessor group '${id}' not found in scene`);
    }
  }
  return out;
}

function setOpacity(refs: GroupRefs, value: number): void {
  for (const m of refs.mats) {
    m.transparent = true;
    m.opacity = value;
  }
}

function setOpaque(refs: GroupRefs): void {
  for (const m of refs.mats) {
    // Materials with PBR transmission > 0 (sapphire crystal, clear plastic,
    // etc.) MUST keep `transparent: true` so three.js routes them through
    // the transmission render pass — forcing transparent=false here would
    // make them render as flat opaque colors mid-animation.
    const phys = m as THREE.MeshPhysicalMaterial;
    if (phys.transmission !== undefined && phys.transmission > 0) {
      m.transparent = true;
    } else {
      m.transparent = false;
    }
    m.opacity = 1;
    m.needsUpdate = true;
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

    // Fix 4: scale tween only for 'add'
    if (cls === 'add') {
      setOpacity(target, 0);
      target.group.scale.setScalar(0.85);
      const dur = 500;
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: dur, resolve,
          step: (t) => {
            const e = easeOutCubic(t);
            setOpacity(target, e);
            target.group.scale.setScalar(0.85 + 0.15 * e);
            if (t >= 1) setOpaque(target);
          },
        });
      });
    }

    // Fix 4: transform/fallback fade in without scale tween
    if (cls === 'transform' || cls === 'fallback') {
      setOpacity(target, 0);
      const dur = cls === 'transform' ? 500 : 400;
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: dur, resolve,
          step: (t) => {
            setOpacity(target, easeOutCubic(t));
            if (t >= 1) setOpaque(target);
          },
        });
      });
    }

    if (cls === 'boolean.cut') {
      setOpacity(target, 0);
      // Fix 5: use helper; Fix 3: warn logged inside helper
      const predGroups = collectPredGroups(this.scene, event.predecessors);
      // Fix 2: capture dur to keep durationMs and step closure in sync
      const dur = 600;
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: dur, resolve,
          step: (t) => {
            const elapsed = t * dur;
            // 0–150ms: cutters flash red
            if (elapsed < 150) {
              for (const pg of predGroups) setColor(pg, 1, 0.3, 0.3);
            } else {
              for (const pg of predGroups) restoreColors(pg);
            }
            // Avoid z-fighting in recorded demos: cut results occupy the same
            // space as their predecessors, and transparent CAD solids expose
            // internal triangulation/backfaces. Flash the old solid, then
            // swap directly to the opaque cut result.
            if (elapsed > 150) {
              for (const pg of predGroups) setOpacity(pg, 0);
              setOpaque(target);
            }
            if (t >= 1) {
              for (const pg of predGroups) setOpacity(pg, 0);
              setOpaque(target);
            }
          },
        });
      });
    }

    if (cls === 'boolean.fuse') {
      setOpacity(target, 0);
      // Fix 5: use helper; Fix 3: warn logged inside helper
      const predGroups = collectPredGroups(this.scene, event.predecessors);
      // Fix 2: capture dur to keep durationMs and step closure in sync
      const dur = 500;
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: dur, resolve,
          step: (t) => {
            const elapsed = t * dur;
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
              setOpaque(target);
            }
          },
        });
      });
    }

    if (cls === 'modifier') {
      // Fix 1: start at 0.7 opacity so the 0–150ms cyan flash is visible
      setOpacity(target, 0.7);
      // Fix 5: use helper; Fix 3: warn logged inside helper
      const predGroups = collectPredGroups(this.scene, event.predecessors);
      // Fix 2: capture dur to keep durationMs and step closure in sync
      const dur = 400;
      return new Promise<void>((resolve) => {
        this.active.push({
          startMs, durationMs: dur, resolve,
          step: (t) => {
            const elapsed = t * dur;
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
              setOpaque(target);
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
