// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { userCacheRoot } from '../../../shared/cache/userCache';
import { fetchPublicBytes, parseFetchUrl } from './importStepFetch';
import { fetchPartTool, type FetchPartOutput } from './fetchPart';
import { findPartTool, type FindPartOutput } from './findPart';
import { inspectStepBuffer } from '../../../kernel/import/inspectStep';

export interface FetchPartModelInput {
  /** Direct public HTTPS STEP/STP/GLB URL. Requires expected_sha256. */
  url?: string;
  expected_sha256?: string;
  ref?: string;
  catalog_id?: string;
  mpn?: string;
  source?: string;
  license?: string;
  attribution?: string;
  bbox_mm?: number[];
  /** Relative expected-versus-measured bbox tolerance, default 0.25. */
  tolerance_ratio?: number;
  partsBaseUrl?: string;
}

export interface FetchPartModelOutput {
  ok: boolean;
  ref?: string;
  errorCode?: string;
  error?: string;
  format?: 'step' | 'glb';
  model_path?: string;
  sha256?: string;
  cache_hit?: boolean;
  bbox_check?: {
    status: 'not_checked' | 'within_tolerance' | 'outside_tolerance';
    expected_mm: number[];
    actual_mm?: number[];
    tolerance_ratio: number;
  };
  attribution?: { source: string; license: string; url?: string; attribution?: string };
}

type FetchPartModelDeps = {
  fetchPart: typeof fetchPartTool;
  findPart: typeof findPartTool;
  fetchBytes: typeof fetchPublicBytes;
};
const defaultDeps: FetchPartModelDeps = { fetchPart: fetchPartTool, findPart: findPartTool, fetchBytes: fetchPublicBytes };
let deps = defaultDeps;
/** Test hook for exercising catalog and download paths without network access. */
export function setFetchPartModelDepsForTest(next?: Partial<FetchPartModelDeps>): void {
  deps = { ...defaultDeps, ...next };
}

const MODEL_MAX_BYTES = 50 * 1024 * 1024;
const SHA256_RE = /^[a-f0-9]{64}$/i;

function fail(error: string, errorCode: string, ref?: string): FetchPartModelOutput {
  return { ok: false, errorCode, error, ...(ref ? { ref } : {}) };
}

function multiply4(a: number[], b: number[]): number[] {
  const out = Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  }
  return out;
}

function nodeMatrix(node: Record<string, unknown>): number[] {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix as number[];
  const t = Array.isArray(node.translation) ? node.translation as number[] : [0, 0, 0];
  const s = Array.isArray(node.scale) ? node.scale as number[] : [1, 1, 1];
  const q = Array.isArray(node.rotation) ? node.rotation as number[] : [0, 0, 0, 1];
  const [x, y, z, w] = q;
  const [sx, sy, sz] = s;
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}

interface GlbDocument {
  scene?: number;
  accessors?: Array<{ min?: number[]; max?: number[] }>;
  meshes?: Array<{ primitives?: Array<{ attributes?: Record<string, number> }> }>;
  nodes?: Array<Record<string, unknown>>;
  scenes?: Array<{ nodes?: number[] }>;
}
interface GlbBounds { min: number[]; max: number[] }
interface GlbAccessor { min?: number[]; max?: number[] }

function readGlbJson(bytes: Uint8Array): GlbDocument | undefined {
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 20 || view.toString('ascii', 0, 4) !== 'glTF' || view.readUInt32LE(4) !== 2 || view.readUInt32LE(8) !== view.byteLength) {
    throw new Error('Invalid GLB header or declared length.');
  }
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const length = view.readUInt32LE(offset);
    const type = view.readUInt32LE(offset + 4);
    offset += 8;
    if (offset + length > view.byteLength) throw new Error('GLB chunk exceeds the declared file length.');
    if (type === 0x4e4f534a) {
      return JSON.parse(view.toString('utf8', offset, offset + length)) as GlbDocument;
    }
    offset += length;
  }
  throw new Error('GLB file has no JSON document chunk.');
}

function includeAccessorBounds(accessor: GlbAccessor, world: number[], bounds: GlbBounds): boolean {
  const lo = accessor.min;
  const hi = accessor.max;
  if (!lo || !hi || lo.length < 3 || hi.length < 3) return false;
  for (let mask = 0; mask < 8; mask++) {
    const point = [mask & 1 ? hi[0] : lo[0], mask & 2 ? hi[1] : lo[1], mask & 4 ? hi[2] : lo[2]];
    const transformed = [0, 1, 2].map(axis => world[axis] * point[0] + world[4 + axis] * point[1] + world[8 + axis] * point[2] + world[12 + axis]);
    for (let axis = 0; axis < 3; axis++) {
      bounds.min[axis] = Math.min(bounds.min[axis], transformed[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], transformed[axis]);
    }
  }
  return true;
}

function includePrimitiveBounds(primitive: NonNullable<NonNullable<GlbDocument['meshes']>[number]['primitives']>[number], doc: GlbDocument, world: number[], bounds: GlbBounds): boolean {
  const accessorIndex = primitive.attributes?.POSITION;
  const accessor = accessorIndex === undefined ? undefined : doc.accessors?.[accessorIndex];
  return accessor ? includeAccessorBounds(accessor, world, bounds) : false;
}

function includeChildBounds(child: number, world: number[], doc: GlbDocument, bounds: GlbBounds): boolean {
  return includeNodeBounds(child, world, doc, bounds);
}

function includeNodeBounds(index: number, parent: number[], doc: GlbDocument, bounds: GlbBounds): boolean {
  const node = doc.nodes?.[index];
  if (!node) return false;
  const world = multiply4(parent, nodeMatrix(node));
  const meshIndex = typeof node.mesh === 'number' ? node.mesh : undefined;
  const primitives = meshIndex === undefined ? [] : doc.meshes?.[meshIndex]?.primitives ?? [];
  let found = false;
  for (const primitive of primitives) if (includePrimitiveBounds(primitive, doc, world, bounds)) found = true;
  for (const child of (node.children as number[] | undefined) ?? []) if (includeChildBounds(child, world, doc, bounds)) found = true;
  return found;
}

/** Read conservative bounds from GLB POSITION accessor min/max, including node transforms. */
function glbBounds(bytes: Uint8Array): number[] | undefined {
  const doc = readGlbJson(bytes);
  if (!doc || !Array.isArray(doc.scenes) || !doc.scenes.length || !Array.isArray(doc.nodes) || !Array.isArray(doc.meshes) || !Array.isArray(doc.accessors)) {
    throw new Error('GLB JSON is missing scenes, nodes, meshes, or accessors.');
  }
  const sceneIndex = typeof doc.scene === 'number' ? doc.scene : 0;
  const scene = doc.scenes[sceneIndex];
  if (!scene || !Array.isArray(scene.nodes)) throw new Error('GLB default scene is missing its node list.');
  const roots = scene.nodes;
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  let found = false;
  for (const root of roots) if (includeNodeBounds(root, identity, doc, bounds)) found = true;
  // glTF 2.0 defines linear distances in meters. Handoff bbox values and the
  // tool output are millimeters, so convert after applying node transforms.
  return found ? bounds.max.map((value, axis) => (value - bounds.min[axis]) * 1000) : undefined;
}

type ResolvedCatalogModel = {
  path?: string; url?: string; expectedHash?: string; source?: string; license?: string; attribution?: string;
  redistribution?: string;
};

type CatalogGlbRecord = {
  id: string;
  glbSha256?: unknown;
  attributes?: Record<string, unknown>;
};

function catalogGlbHash(record: CatalogGlbRecord): string | undefined {
  const attributes = record.attributes ?? {};
  const value = record.glbSha256 ?? attributes.glbSha256 ?? attributes.glb_sha256;
  return typeof value === 'string' ? value : undefined;
}

function resolveCatalogGlbHash(input: FetchPartModelInput, record: CatalogGlbRecord): string | FetchPartModelOutput {
  const glbHash = catalogGlbHash(record);
  if (glbHash) return glbHash;
  if (input.expected_sha256) return input.expected_sha256;
  return fail(`Catalog part '${record.id}' has a GLB URL but no GLB-specific SHA-256 digest. Its catalog sha256 may identify the STEP asset; pass expected_sha256 for this GLB.`, 'model.catalog-glb-hash-required', input.ref);
}

async function resolveCatalogFallback(input: FetchPartModelInput): Promise<ResolvedCatalogModel | FetchPartModelOutput> {
  const found: FindPartOutput = await deps.findPart({ query: input.catalog_id ?? input.mpn, limit: 5, ...(input.partsBaseUrl ? { partsBaseUrl: input.partsBaseUrl } : {}) });
  if (!found.ok) return fail(found.error, 'model_not_found', input.ref);
  const records = input.catalog_id ? found.results.filter(record => record.id === input.catalog_id) : found.results;
  if (records.length !== 1) return fail(records.length ? 'Catalog lookup is ambiguous; pass catalog_id.' : 'No catalog model found for this part.', records.length ? 'model.lookup-ambiguous' : 'model_not_found', input.ref);
  const record = records[0];
  if (!record.glbUrl) return fail(`Catalog part '${record.id}' has no GLB model.`, 'model_not_found', input.ref);
  const expectedHash = resolveCatalogGlbHash(input, record);
  if (typeof expectedHash !== 'string') return expectedHash;
  return { url: record.glbUrl, expectedHash, source: record.source, license: record.license, attribution: record.attribution, redistribution: record.redistribution };
}

async function resolveFetchedCatalogModel(input: FetchPartModelInput, fetched: FetchPartOutput): Promise<ResolvedCatalogModel | FetchPartModelOutput> {
  if (fetched.ok && 'record' in fetched) {
    if (fetched.record.attributes.geometryKind === 'mesh') {
      if (!fetched.record.glbUrl) return fail(`Catalog part '${fetched.record.id}' is mesh geometry without a GLB model URL.`, 'model_not_found', input.ref);
      const expectedHash = resolveCatalogGlbHash(input, fetched.record);
      if (typeof expectedHash !== 'string') return expectedHash;
      return { url: fetched.record.glbUrl, expectedHash, source: fetched.record.source, license: fetched.record.license, attribution: fetched.record.attribution, redistribution: fetched.record.redistribution };
    }
    return { path: fetched.cachePath || undefined, expectedHash: fetched.sha256, source: fetched.record.source, license: fetched.record.license, attribution: fetched.record.attribution, redistribution: fetched.record.redistribution };
  }
  if (fetched.ok && fetched.kind === 'link_out') return fail(`Catalog lookup requires a user-driven vendor download: ${fetched.instruction}`, 'model.link-out-required', input.ref);
  const code = 'errorCode' in fetched ? fetched.errorCode : undefined;
  if (!fetched.ok && code !== 'parts.fetch.geometry-not-brep') return fail(fetched.error, code || 'model.lookup-failed', input.ref);
  return resolveCatalogFallback(input);
}

async function resolveCatalogModel(input: FetchPartModelInput): Promise<ResolvedCatalogModel | FetchPartModelOutput> {
  const selector = input.catalog_id ? { id: input.catalog_id } : input.mpn ? { query: input.mpn } : undefined;
  if (!selector) return fail('Pass url + expected_sha256, catalog_id, or mpn.', 'model.selector-required', input.ref);
  const fetched: FetchPartOutput = await deps.fetchPart({ ...selector, ...(input.partsBaseUrl ? { partsBaseUrl: input.partsBaseUrl } : {}) });
  return resolveFetchedCatalogModel(input, fetched);
}

function validateModelInput(input: FetchPartModelInput): number | FetchPartModelOutput {
  const tolerance = input.tolerance_ratio ?? 0.25;
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 5) return fail('tolerance_ratio must be between 0 and 5.', 'model.invalid-tolerance', input.ref);
  const bbox = input.bbox_mm;
  if (bbox !== undefined && (bbox.length !== 3 || bbox.some(value => !Number.isFinite(value) || value <= 0))) return fail('bbox_mm must contain three positive dimensions.', 'model.invalid-bbox', input.ref);
  return tolerance;
}

type ModelSource = ResolvedCatalogModel & { expectedHash?: string };

function resolveExplicitModelSource(input: FetchPartModelInput & { url: string }): ModelSource | FetchPartModelOutput {
  if (!input.expected_sha256 || !SHA256_RE.test(input.expected_sha256)) return fail('A valid expected_sha256 is required with an explicit URL.', 'model.hash-required', input.ref);
  if (!input.source || !input.license) return fail('source and license are required for an explicit model URL.', 'model.provenance-required', input.ref);
  return { url: input.url, expectedHash: input.expected_sha256, source: input.source, license: input.license, attribution: input.attribution };
}

async function resolveModelSource(input: FetchPartModelInput): Promise<ModelSource | FetchPartModelOutput> {
  if (input.url) return resolveExplicitModelSource({ ...input, url: input.url });
  let resolved: ResolvedCatalogModel | FetchPartModelOutput;
  try { resolved = await resolveCatalogModel(input); }
  catch (error) { return fail(error instanceof Error ? error.message : String(error), 'model.lookup-failed', input.ref); }
  if ('ok' in resolved) return resolved;
  if (resolved.redistribution === 'fetch-only' && (!resolved.source || !resolved.license || !resolved.expectedHash || !SHA256_RE.test(resolved.expectedHash))) {
    return fail('Fetch-only catalog models require provenance and a valid asset SHA-256 digest.', 'model.fetch-only-provenance-required', input.ref);
  }
  const expectedHash = input.expected_sha256 ?? resolved.expectedHash;
  if (!expectedHash || !SHA256_RE.test(expectedHash)) return fail('Catalog model is missing a valid SHA-256 digest.', 'model.catalog-hash-missing', input.ref);
  return { ...resolved, expectedHash };
}

interface ModelFileState {
  path?: string;
  url?: string;
  expectedHash?: string;
  format: 'step' | 'glb';
  suffix: string;
}

function resolveModelFile(input: FetchPartModelInput, source: ModelSource): ModelFileState | FetchPartModelOutput {
  if (!source.url && !source.path) return fail('Catalog resolution returned no model path or URL.', 'model_not_found', input.ref);
  const parsed = source.url ? parseFetchUrl(source.url) : undefined;
  if (typeof parsed === 'string') return fail(parsed, 'model.invalid-url', input.ref);
  const suffix = extname(parsed?.pathname ?? source.path!).toLowerCase();
  if (suffix !== '.step' && suffix !== '.stp' && suffix !== '.glb') return fail('Model must be a .step, .stp, or .glb file.', 'model.unsupported-format', input.ref);
  if (source.expectedHash !== undefined && !SHA256_RE.test(source.expectedHash)) return fail('expected_sha256 must be a 64-character hexadecimal digest.', 'model.invalid-hash', input.ref);
  return { path: source.path, url: source.url, expectedHash: source.expectedHash, format: suffix === '.glb' ? 'glb' : 'step', suffix };
}

interface ReadModelResult { bytes: Buffer; path?: string; cacheHit: boolean }

async function readModelBytes(state: ModelFileState): Promise<ReadModelResult | string> {
  let path = state.path;
  let bytes = Buffer.alloc(0);
  let cacheHit = false;
  if (!path && state.expectedHash) {
    const cachedPath = join(userCacheRoot(), 'part-models', `${state.expectedHash.toLowerCase()}${state.suffix === '.stp' ? '.step' : state.suffix}`);
    try { bytes = await readFile(cachedPath); path = cachedPath; cacheHit = true; } catch { bytes = Buffer.alloc(0); }
  }
  try {
    if (path) {
      if (bytes.byteLength === 0) bytes = await readFile(path);
    } else {
      const downloaded = await deps.fetchBytes(state.url!, MODEL_MAX_BYTES);
      if (typeof downloaded === 'string') return downloaded;
      bytes = Buffer.from(downloaded);
    }
  } catch (error) { return error instanceof Error ? error.message : String(error); }
  return bytes.byteLength ? { bytes, path, cacheHit } : 'Model file is empty.';
}

async function cacheModel(bytes: Buffer, sha256: string, state: ModelFileState, path?: string): Promise<{ path?: string; cacheHit: boolean }> {
  if (path) return { path, cacheHit: false };
  const cacheDir = join(userCacheRoot(), 'part-models');
  const modelPath = join(cacheDir, `${sha256}${state.suffix === '.stp' ? '.step' : state.suffix}`);
  await mkdir(cacheDir, { recursive: true });
  let cacheHit = false;
  try {
    await readFile(modelPath);
    cacheHit = true;
  } catch {
    await writeFile(modelPath, bytes, { flag: 'wx' }).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    });
  }
  return { path: modelPath, cacheHit };
}

interface LoadedModel extends ReadModelResult { sha256: string; path?: string }

async function loadModel(state: ModelFileState, ref?: string): Promise<LoadedModel | FetchPartModelOutput> {
  const read = await readModelBytes(state);
  if (typeof read === 'string') return fail(read, read === 'Model file is empty.' ? 'model.empty' : state.url ? 'model.download-failed' : 'model.read-failed', ref);
  const sha256 = createHash('sha256').update(read.bytes).digest('hex');
  if (state.expectedHash && sha256.toLowerCase() !== state.expectedHash.toLowerCase()) return fail('Model SHA-256 does not match expected_sha256.', 'model.hash-mismatch', ref);
  try {
    const cached = await cacheModel(read.bytes, sha256, state, read.path);
    return { ...read, path: cached.path, cacheHit: read.cacheHit || cached.cacheHit, sha256 };
  }
  catch (error) { return fail(error instanceof Error ? error.message : String(error), 'model.cache-failed', ref); }
}

async function measureStepBounds(bytes: Buffer, state: ModelFileState): Promise<number[] | string> {
  try {
    const report = await inspectStepBuffer(bytes, state.path ?? state.url ?? 'handoff STEP');
    if (!report.solids.length) return 'STEP model contains no measurable solids.';
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const solid of report.solids) for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], solid.bboxExact.min[axis]);
      max[axis] = Math.max(max[axis], solid.bboxExact.max[axis]);
    }
    return max.map((value, axis) => value - min[axis]);
  } catch (error) { return `STEP model could not be measured: ${error instanceof Error ? error.message : String(error)}`; }
}

async function measureBounds(bytes: Buffer, state: ModelFileState, ref?: string): Promise<number[] | FetchPartModelOutput | undefined> {
  if (state.format === 'glb') {
    try { return glbBounds(bytes) ?? undefined; }
    catch (error) { return fail(`GLB bounds could not be read: ${error instanceof Error ? error.message : String(error)}`, 'model.invalid-glb', ref); }
  }
  const measured = await measureStepBounds(bytes, state);
  return typeof measured === 'string' ? fail(measured, 'model.bbox-unavailable', ref) : measured;
}

async function checkBbox(input: FetchPartModelInput, state: ModelFileState, loaded: LoadedModel, tolerance: number): Promise<FetchPartModelOutput['bbox_check'] | FetchPartModelOutput> {
  const expected = input.bbox_mm ?? [];
  if (!input.bbox_mm) return { status: 'not_checked', expected_mm: expected, tolerance_ratio: tolerance };
  const actual = await measureBounds(loaded.bytes, state, input.ref);
  if (actual === undefined) return { status: 'not_checked', expected_mm: expected, tolerance_ratio: tolerance };
  if (!Array.isArray(actual)) return actual;
  const measuredSorted = [...actual].sort((a, b) => a - b);
  const expectedSorted = [...expected].sort((a, b) => a - b);
  const within = measuredSorted.every((dimension, axis) => Math.abs(dimension - expectedSorted[axis]) / expectedSorted[axis] <= tolerance);
  return { status: within ? 'within_tolerance' : 'outside_tolerance', expected_mm: expected, actual_mm: actual, tolerance_ratio: tolerance };
}

export async function fetchPartModelTool(input: FetchPartModelInput): Promise<FetchPartModelOutput> {
  const tolerance = validateModelInput(input);
  if (typeof tolerance !== 'number') return tolerance;
  const source = await resolveModelSource(input);
  if ('ok' in source) return source;
  const state = resolveModelFile(input, source);
  if ('ok' in state) return state;
  const loaded = await loadModel(state, input.ref);
  if ('ok' in loaded) return loaded;
  const bboxCheck = await checkBbox(input, state, loaded, tolerance);
  if (bboxCheck && !('status' in bboxCheck)) return bboxCheck;
  return {
    ok: true,
    ...(input.ref ? { ref: input.ref } : {}),
    format: state.format,
    model_path: loaded.path,
    sha256: loaded.sha256,
    cache_hit: loaded.cacheHit,
    bbox_check: bboxCheck,
    attribution: { source: source.source ?? 'catalog', license: source.license ?? 'unknown', ...(state.url ? { url: state.url } : {}), ...(source.attribution ? { attribution: source.attribution } : {}) },
  };
}
