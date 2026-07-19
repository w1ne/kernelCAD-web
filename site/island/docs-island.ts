// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Main-thread half of the live docs: the editor, the canvas, and the prebaked
// model a reader sees before they touch anything.
//
// Two things load on two different schedules, and keeping them apart is the
// point of this file:
//
//   - This module (three.js and OrbitControls) is imported after the page has
//     painted, so every example already shows its geometry and can be rotated
//     straight away. The model itself is a build artifact — see
//     site/scripts/prebake-docs-models.ts — of the same source printed above it,
//     in this repo's own mesh format rather than GLB, because a glTF parser cost
//     more than everything else here put together.
//   - The engine (site/island/docs-worker.ts, ~11 MB of OCCT wasm) is not
//     touched until someone presses Run. Prebaking exists precisely so nobody
//     pays for that just to look at a page.
//
// The page is complete before either arrives: build-docs.ts emits the code, the
// caption and the API table as static HTML. With JavaScript off, nothing here
// runs and nothing above is missing.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { decodeDocsMesh } from './docsMesh';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildPrebakedBody, buildLiveFeature, disposeBodyTree } from './docsBody';
import type { DocsAppearance } from './docsAppearance';
import type {
  DocsRunRequest,
  DocsRunResponse,
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

interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** The `data-docs-model` payload build-docs.ts writes onto each stage. */
interface PrebakedModel {
  url: string;
  bounds: { min: number[]; max: number[] };
  appearances: DocsAppearance[];
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  bodies: THREE.Group;
  /** Bounds the camera was last framed on; null until something is drawn. */
  framedOn: Bounds | null;
}

const stages = new WeakMap<HTMLElement, Stage>();
/** Examples with a Run in flight, so the engine-ready broadcast skips them. */
const running = new WeakSet<HTMLElement>();

let worker: Worker | null = null;
let nextRequestId = 1;
/** Resolvers keyed by request id. A terminated worker rejects the one in flight. */
const pending = new Map<number, (response: DocsRunResponse) => void>();

function spawnWorker(): Worker {
  const w = new Worker(new URL('./docs-worker.ts', import.meta.url), { type: 'module' });
  w.addEventListener('message', (event: MessageEvent<DocsRunResponse | DocsReadyMessage>) => {
    const data = event.data;
    if ('kind' in data) {
      document.querySelectorAll('[data-docs-example]').forEach((node) => {
        const root = node as HTMLElement;
        if (running.has(root)) return; // its own run will report the real status
        setStatus(root, 'Ready', 'idle');
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
  // Revealed only when there is something to put in it. An empty canvas that
  // fills 380px reads as a broken page.
  host.hidden = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();

  // An environment map, and it is not optional.
  //
  // A MeshStandardMaterial with metalness > 0 has no diffuse term — every bit
  // of a metal's colour is reflected environment. With lights alone there is
  // nothing to reflect, so any metalness at all drags the render toward black:
  // #2b3137 at metalness 0.28 came out as a featureless charcoal wedge with the
  // fillet and the shell wall both invisible. Lights cannot fix that; only
  // something to reflect can.
  //
  // Replacing it with a generated gradient was tried, to save the 1.7 KB
  // gzipped this import costs. Both an 8-bit and a float equirect rendered the
  // parts materially darker than this does — the 8-bit one by 2.7x — and the
  // shell-and-fillet example went back to being an unreadable wedge. 1% of the
  // bundle is not worth re-introducing the bug this branch exists to fix.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // A warm key and a cool fill from opposite sides, on top of the environment.
  // Lighting a coloured part from one white lamp flattens it back to the grey
  // this viewer used to be: the two tints are what separate a curved face from
  // a flat one, and what makes a fillet read as a highlight band.
  const key = new THREE.DirectionalLight(0xFFF4E0, 1.6);
  key.position.set(1, 1.4, 1.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xC8D8F0, 0.7);
  fill.position.set(-1, -0.6, -0.8);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 10_000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  const bodies = new THREE.Group();
  scene.add(bodies);

  const stage: Stage = { renderer, scene, camera, controls, bodies, framedOn: null };
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
  disposeBodyTree(stage.bodies);
  stage.bodies.clear();
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
  stage.framedOn = bounds;
}

/**
 * Whether Run should move the camera. Re-framing on every Run would yank the
 * view out from under a reader who orbited and then re-ran unchanged code; not
 * re-framing at all would leave an edited model half off-screen. So: move only
 * when the model actually changed size or place.
 */
function boundsDiffer(a: Bounds | null, b: Bounds): boolean {
  if (a === null) return true;
  const scale = Math.max(1, ...b.max.map(Math.abs), ...b.min.map(Math.abs));
  const tolerance = scale * 1e-4;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(a.min[i] - b.min[i]) > tolerance) return true;
    if (Math.abs(a.max[i] - b.max[i]) > tolerance) return true;
  }
  return false;
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

/**
 * Draw the model this example was built with.
 *
 * Loaded and parsed before the canvas is revealed, so the reader goes from
 * "nothing there" to "the part", never through an empty grey box. A failure
 * here leaves the page exactly as it was — with the source, the tables, and a
 * working Run button. It never substitutes a shape: a stand-in the reader
 * mistakes for the example's output is worse than no picture.
 */
async function showPrebaked(root: HTMLElement): Promise<void> {
  const host = root.querySelector('.docs-stage');
  if (!(host instanceof HTMLElement)) return;
  const raw = host.dataset.docsModel;
  if (raw === undefined) return;

  const model = JSON.parse(raw) as PrebakedModel;
  const response = await fetch(model.url);
  if (!response.ok) throw new Error(`${model.url} — HTTP ${response.status}`);
  const features = decodeDocsMesh(await response.arrayBuffer());

  // File order is bake order, so the appearance list lines up by index. The GLB
  // version had to stamp `feature-N` names and sort by them, because a glTF
  // scene graph gives no traversal-order guarantee worth relying on.
  if (features.length !== model.appearances.length) {
    throw new Error(
      `${model.url} has ${features.length} bodies, manifest describes ${model.appearances.length}`,
    );
  }

  const stage = ensureStage(root);
  if (!stage) return;
  features.forEach((feature, i) => {
    stage.bodies.add(buildPrebakedBody(feature, model.appearances[i]));
  });
  frame(stage, { min: model.bounds.min as Bounds['min'], max: model.bounds.max as Bounds['max'] });
}

async function run(root: HTMLElement): Promise<void> {
  const editor = root.querySelector('.docs-editor');
  if (!(editor instanceof HTMLTextAreaElement)) return;

  clearError(root);
  running.add(root);
  // First Run on the page pays for the engine. Say so rather than sitting on
  // "Running…" for ten seconds.
  setStatus(root, worker === null ? 'Loading engine…' : 'Running…', 'busy');

  // The prebaked model stays on screen for the whole run. Clearing it first
  // would flash an empty canvas for every reader who pressed Run to watch the
  // same code rebuild.
  const response = await dispatch(editor.value);
  running.delete(root);
  const stage = ensureStage(root);
  if (!stage) return;

  if (!response.ok) {
    // Clear the previous model first. Leaving it on screen next to an error
    // invites the reader to take it as the result of the code they just
    // edited, which is the same lie as rendering a placeholder.
    disposeBodies(stage);
    stage.framedOn = null;
    showError(root, response.error);
    return;
  }

  disposeBodies(stage);
  for (const feature of response.features) {
    stage.bodies.add(buildLiveFeature(feature));
  }
  if (boundsDiffer(stage.framedOn, response.bounds)) frame(stage, response.bounds);
  setStatus(
    root,
    `${response.featureCount} feature${response.featureCount === 1 ? '' : 's'} · ${response.elapsedMs} ms`,
    'idle',
  );
}

/**
 * Take over every example on the page: replace the static highlighted listing
 * with an editable copy of the same source, and draw the prebaked model.
 * Idempotent — the bootstrap calls it once, but a double call is harmless.
 *
 * Nothing here starts the engine. The worker is constructed by the first Run.
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
    setStatus(root, '', 'idle');

    void showPrebaked(root).catch((err: unknown) => {
      // Logged, not shown. The page is still whole and Run still works; a
      // banner about a missing preview would be noise for a reader who came to
      // read the API.
      console.warn('docs: prebaked model unavailable', err);
    });
  });

  return { run };
}
