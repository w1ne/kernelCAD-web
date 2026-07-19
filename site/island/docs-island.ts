// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Main-thread half of the live docs. Loaded by a dynamic import the first time
// a reader touches an example, never on page load — everything here plus the
// worker it spawns is a few hundred KB of three.js in front of a 10.8 MB wasm,
// and most readers are here to read.
//
// The page is complete before this file arrives: build-docs.ts emits the code,
// the caption and the API table as static HTML. This adds the editor and the
// canvas on top. With JavaScript off, nothing below runs and nothing above is
// missing.
//
// Contract with the page (site/scripts/build-docs.ts writes the markup, and an
// inline bootstrap there owns the Run clicks so a click that arrives before
// this module loads is not dropped).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { resolveColor } from '../../src/shared/render/palette';
import type {
  DocsRunRequest,
  DocsRunResponse,
  DocsMeshFeature,
  DocsReadyMessage,
} from './docs-worker';

/**
 * Wall-clock budget for one Run, enforced here by terminating the worker.
 *
 * Must equal `BROWSER_SCRIPT_TIMEOUT_MS` from the browser runtime, which is
 * advertised as the budget but cannot enforce itself: the script runs under
 * `new Function`, and synchronous JavaScript is not interruptible from inside
 * its own realm. `worker.terminate()` is the only interrupt that exists.
 * docsIslandTimeout.test.ts fails if these two drift apart.
 */
export const DOCS_RUN_TIMEOUT_MS = 30_000;

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  bodies: THREE.Group;
}

const stages = new WeakMap<HTMLElement, Stage>();

let worker: Worker | null = null;
let nextRequestId = 1;
/** Resolvers keyed by request id. A terminated worker rejects the one in flight. */
const pending = new Map<number, (response: DocsRunResponse) => void>();

function spawnWorker(): Worker {
  const w = new Worker(new URL('./docs-worker.ts', import.meta.url), { type: 'module' });
  w.addEventListener('message', (event: MessageEvent<DocsRunResponse | DocsReadyMessage>) => {
    const data = event.data;
    if ('kind' in data) {
      document.querySelectorAll('[data-docs-example]').forEach((root) => {
        setStatus(root as HTMLElement, 'Ready', 'idle');
      });
      return;
    }
    const resolve = pending.get(data.id);
    if (!resolve) return; // superseded run; the reader has already moved on
    pending.delete(data.id);
    resolve(data);
  });
  return w;
}

/**
 * Kill the worker and fail everything waiting on it. Used for the run deadline
 * and for a worker crash — in both cases the thread is gone and the next Run
 * must start a fresh one, paying the wasm load again. That is the price of the
 * only interrupt the platform offers.
 */
function terminateWorker(reason: string): void {
  worker?.terminate();
  worker = null;
  for (const [id, resolve] of pending) {
    resolve({ id, ok: false, error: reason });
  }
  pending.clear();
}

function setStatus(root: HTMLElement, text: string, state: 'idle' | 'busy' | 'error'): void {
  const status = root.querySelector('.docs-status');
  if (!(status instanceof HTMLElement)) return;
  status.textContent = text;
  status.dataset.state = state;
}

function showError(root: HTMLElement, message: string): void {
  const box = root.querySelector('.docs-error');
  if (box instanceof HTMLElement) {
    // The kernel's own words. Nothing is summarized or replaced with a friendly
    // stand-in — a reader debugging their edit needs the real diagnostic.
    box.textContent = message;
    box.hidden = false;
  }
  setStatus(root, 'Failed', 'error');
}

function clearError(root: HTMLElement): void {
  const box = root.querySelector('.docs-error');
  if (box instanceof HTMLElement) {
    box.hidden = true;
    box.textContent = '';
  }
}

function ensureStage(root: HTMLElement): Stage | null {
  const existing = stages.get(root);
  if (existing) return existing;

  const host = root.querySelector('.docs-stage');
  const canvas = root.querySelector('canvas');
  if (!(host instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return null;
  host.hidden = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  // Two lights and an ambient: enough to read a form, cheap enough that the
  // canvas is never the reason the page feels slow.
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(1, 1.4, 1.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-1, -0.6, -0.8);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 10_000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  const bodies = new THREE.Group();
  scene.add(bodies);

  const stage: Stage = { renderer, scene, camera, controls, bodies };
  stages.set(root, stage);

  const resize = (): void => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(host);

  const tick = (): void => {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  return stage;
}

function disposeBodies(stage: Stage): void {
  stage.bodies.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      const material = node.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    }
  });
  stage.bodies.clear();
}

function buildFeature(feature: DocsMeshFeature): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(resolveColor(feature.color));
  for (const face of feature.faces) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(face.indices, 1));
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.1,
      roughness: 0.62,
      // OCCT emits per-face islands with outward normals; without this the
      // inside of a shelled body reads as a hole.
      side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(geometry, material));
  }
  if (feature.transform) {
    // Column-major 4x4 from the assembly solver, which is three's own layout.
    group.matrixAutoUpdate = false;
    group.matrix.fromArray(feature.transform as number[]);
  }
  return group;
}

interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

function frame(stage: Stage, bounds: Bounds): void {
  const min = new THREE.Vector3(...bounds.min);
  const max = new THREE.Vector3(...bounds.max);
  const center = min.clone().add(max).multiplyScalar(0.5);
  const radius = Math.max(max.distanceTo(min) * 0.5, 1);
  const distance = radius / Math.sin((stage.camera.fov * Math.PI) / 360);

  stage.controls.target.copy(center);
  stage.camera.position.copy(center).add(new THREE.Vector3(1, -1.15, 0.85).normalize().multiplyScalar(distance));
  stage.camera.near = distance / 100;
  stage.camera.far = distance * 100;
  stage.camera.updateProjectionMatrix();
  stage.controls.update();
}

/** Post one script to the worker and resolve when it answers or the deadline hits. */
function dispatch(code: string): Promise<DocsRunResponse> {
  worker ??= spawnWorker();
  const id = nextRequestId++;
  const request: DocsRunRequest = { id, code };
  return new Promise<DocsRunResponse>((resolve) => {
    const deadline = setTimeout(() => {
      // The script is still running and cannot be asked to stop. Killing the
      // thread is the interrupt.
      terminateWorker(
        `Stopped after ${DOCS_RUN_TIMEOUT_MS / 1000}s — check for an unbounded loop.`,
      );
    }, DOCS_RUN_TIMEOUT_MS);
    pending.set(id, (response) => {
      clearTimeout(deadline);
      resolve(response);
    });
    worker?.postMessage(request);
  });
}

async function run(root: HTMLElement): Promise<void> {
  const editor = root.querySelector('.docs-editor');
  if (!(editor instanceof HTMLTextAreaElement)) return;
  const stage = ensureStage(root);
  if (!stage) return;

  clearError(root);
  setStatus(root, 'Running…', 'busy');

  const response = await dispatch(editor.value);
  if (!response.ok) {
    // Clear the previous run's model first. Leaving it on screen next to an
    // error invites the reader to take it as the result of the code they just
    // edited, which is the same lie as rendering a placeholder.
    disposeBodies(stage);
    showError(root, response.error);
    return;
  }

  disposeBodies(stage);
  for (const feature of response.features) {
    stage.bodies.add(buildFeature(feature));
  }
  frame(stage, response.bounds);
  setStatus(
    root,
    `${response.featureCount} feature${response.featureCount === 1 ? '' : 's'} · ${response.elapsedMs} ms`,
    'idle',
  );
}

/**
 * Take over every example on the page: replace the static highlighted listing
 * with an editable copy of the same source, and start the engine downloading.
 * Idempotent — the bootstrap calls it once, but a double call is harmless.
 */
export function mount(): { run: (root: HTMLElement) => Promise<void> } {
  document.querySelectorAll('[data-docs-example]').forEach((node) => {
    const root = node as HTMLElement;
    if (root.dataset.docsMounted === 'true') return;
    root.dataset.docsMounted = 'true';

    const highlight = root.querySelector('.docs-highlight');
    const editor = root.querySelector('.docs-editor');
    if (highlight instanceof HTMLElement && editor instanceof HTMLTextAreaElement) {
      // The textarea already holds the exact source the highlighted block
      // renders; swapping is a visibility change, not a content copy, so there
      // is no way for the two to disagree.
      highlight.hidden = true;
      editor.hidden = false;
      editor.style.height = `${editor.scrollHeight}px`;
      editor.addEventListener('input', () => {
        editor.style.height = 'auto';
        editor.style.height = `${editor.scrollHeight}px`;
      });
    }
    setStatus(root, 'Loading engine…', 'busy');
  });

  worker ??= spawnWorker();
  return { run };
}
