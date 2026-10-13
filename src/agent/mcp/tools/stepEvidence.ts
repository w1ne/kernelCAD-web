// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import { headlessRender } from '../../render/headlessRender';
import { resolveRenderBaseUrl } from '../../render/playerServer';

type Bounds = { min: [number, number, number]; max: [number, number, number] };
export interface StepFrame { view: 'iso'; width: number; height: number; bounds: Bounds }
export interface StepState { bounds: Bounds; volume: number; brep?: Uint8Array; error?: string }
export interface StepEvidence {
  /** Build health and finite measurements, not a topology or manufacturing certificate. */
  validity: { status: 'valid' | 'invalid' | 'unverified'; checks: string[]; volume?: number };
  snapshots: { status: 'captured' | 'unavailable'; frame?: StepFrame; before?: string; after?: string; out_dir?: string; error?: string };
}

/** Copy the previous geometry before another evaluation can replace the session. */
export function captureStepState(shape: ShapeBackend | undefined): StepState | undefined {
  if (!shape) return undefined;
  try {
    const bounds = shape.boundingBox();
    const state: StepState = { bounds: { min: [...bounds.min], max: [...bounds.max] }, volume: shape.volume() };
    try { state.brep = shape.exportBREP?.().slice(); }
    catch (error) { state.error = String(error); }
    return state;
  } catch (error) {
    return { bounds: { min: [NaN, NaN, NaN], max: [NaN, NaN, NaN] }, volume: NaN, error: String(error) };
  }
}

export type StepRenderer = (scriptPath: string, frame: StepFrame) => Promise<Buffer>;
async function renderStep(scriptPath: string, frame: StepFrame): Promise<Buffer> {
  // Use the caller's attached browser, never provision a second browser for
  // automatic step evidence. Ordinary render_preview remains available.
  if (!process.env.PW_CDP_URL) throw new Error('Step snapshots require an existing browser attachment (PW_CDP_URL).');
  const base = await resolveRenderBaseUrl();
  try {
    const result = await headlessRender({ scriptPath, viewportWidth: frame.width, viewportHeight: frame.height,
      views: [frame.view], frameBounds: frame.bounds, baseUrl: base.baseUrl, environment: 'none', noWatermark: true });
    const png = result.pngsByView.iso;
    if (!png) throw new Error('Renderer returned no iso snapshot.');
    return png;
  } finally { await base.close(); }
}

function hasFiniteBounds(state: StepState): boolean {
  return [...state.bounds.min, ...state.bounds.max].every(Number.isFinite);
}

function hasFiniteGeometry(state: StepState | undefined): state is StepState {
  return state !== undefined && Number.isFinite(state.volume) && state.volume >= 0 &&
    hasFiniteBounds(state) && state.bounds.min.every((v, i) => v <= state.bounds.max[i]);
}

function stepValidity(
  after: StepState | undefined,
  ok: boolean,
  health: readonly { status: string }[],
): StepEvidence['validity'] {
  const finite = hasFiniteGeometry(after);
  let status: StepEvidence['validity']['status'] = after ? 'valid' : 'unverified';
  if (!ok || health.length > 0 || (after !== undefined && !finite)) status = 'invalid';
  return {
    status,
    checks: ['build', 'feature-health', ...(after ? ['finite-geometry'] : [])],
    ...(finite ? { volume: after.volume } : {}),
  };
}

function canCapturePair(before: StepState | undefined, after: StepState | undefined): boolean {
  if (!hasFiniteGeometry(after) || !after.brep) return false;
  return before === undefined || (before.brep !== undefined && hasFiniteBounds(before));
}

function sharedStepFrame(before: StepState | undefined, after: StepState): StepFrame {
  return { view: 'iso', width: 512, height: 512, bounds: {
    min: after.bounds.min.map((v, i) => Math.min(v, before?.bounds.min[i] ?? v)) as Bounds['min'],
    max: after.bounds.max.map((v, i) => Math.max(v, before?.bounds.max[i] ?? v)) as Bounds['max'],
  } };
}

async function writeStepImage(
  dir: string,
  name: 'before' | 'after',
  state: StepState,
  frame: StepFrame,
  render: StepRenderer,
): Promise<string> {
  await writeFile(join(dir, `${name}.brep`), state.brep!);
  const scriptPath = join(dir, `${name}.kcad.ts`);
  await writeFile(scriptPath, `// Immutable MCP step state\nreturn await lib.fromBREP('./${name}.brep');\n`);
  const png = await render(scriptPath, frame);
  const imagePath = join(dir, `${name}.png`);
  await writeFile(imagePath, png);
  return imagePath;
}

async function captureStepPair(
  before: StepState | undefined,
  after: StepState,
  frame: StepFrame,
  render: StepRenderer,
): Promise<StepEvidence['snapshots']> {
  let dir: string | undefined;
  try {
    dir = await mkdtemp(join(tmpdir(), 'kernelcad-step-'));
    await mkdir(dir, { recursive: true });
    const images: { before?: string; after?: string } = {};
    if (before) images.before = await writeStepImage(dir, 'before', before, frame, render);
    images.after = await writeStepImage(dir, 'after', after, frame, render);
    await writeFile(join(dir, 'frame.json'), JSON.stringify(frame, null, 2));
    return { status: 'captured', frame, ...images, out_dir: dir };
  } catch (error) {
    return { status: 'unavailable', frame, out_dir: dir, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function createStepEvidence(
  before: StepState | undefined,
  after: StepState | undefined,
  ok: boolean,
  health: readonly { status: string }[],
  render: StepRenderer = renderStep,
): Promise<StepEvidence> {
  const validity = stepValidity(after, ok, health);
  if (!after || !canCapturePair(before, after)) {
    return { validity, snapshots: { status: 'unavailable', error: after?.error ?? 'No exportable finite geometry for the step pair.' } };
  }
  const frame = sharedStepFrame(before, after);
  return { validity, snapshots: await captureStepPair(before, after, frame, render) };
}
