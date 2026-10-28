// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { buildModelFromFile } from '../src/modeling/buildModel';

export interface SolidCraftExpected {
  volumeMm3: number;
  surfaceAreaMm2: number;
  centerOfMass: [number, number, number];
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

type SolidCraftActual = SolidCraftExpected;

export interface ToleranceSpec {
  volumeRelative: number;
  surfaceAreaRelative: number;
  bboxAbsoluteFloorMm: number;
  bboxRelativeOfDiagonal: number;
  centerOfMassAbsoluteFloorMm: number;
  centerOfMassRelativeOfDiagonal: number;
  notes: string;
}

export interface EffectiveTolerances {
  volumeRelative: number;
  surfaceAreaRelative: number;
  bboxAbsoluteMm: number;
  centerOfMassAbsoluteMm: number;
}

export interface MetricComparison {
  pass: boolean;
  volumePass: boolean;
  surfaceAreaPass: boolean;
  bboxPass: boolean;
  centerOfMassPass: boolean;
  volumeRelativeError: number;
  surfaceAreaRelativeError: number;
  bboxMaxAbsoluteErrorMm: number;
  centerOfMassMaxAbsoluteErrorMm: number;
}

export type DeclaredStatus = 'pass' | 'known-failure' | 'pending';
export type LedgerTier = 'pr' | 'nightly';
export type RunStatus = 'PASS' | 'KNOWN FAIL' | 'FAIL';

export interface LedgerCase {
  id: string;
  name: string;
  ci: LedgerTier;
  status: DeclaredStatus;
  source?: string;
  expected: SolidCraftExpected;
  provenance: { kind: 'analytic' | 'freecad'; upstream: string; details: string };
  bodyCount: number;
  faces?: number;
  note?: string;
  knownFailureReason?: string;
}

export interface LedgerLimits {
  perPartMs: number;
  prTotalMs: number;
  nightlyPerPartMs: number;
  nightlyTotalMs: number;
}

export interface LedgerSource {
  project: string;
  url: string;
  commit: string;
  committedAt: string;
  license: string;
  licenseNote: string;
}

export interface LedgerManifest {
  schemaVersion: 1;
  source: LedgerSource;
  units: { length: 'mm'; volume: 'mm^3'; surfaceArea: 'mm^2' };
  tolerances: ToleranceSpec;
  limits: LedgerLimits;
  cases: LedgerCase[];
}

export interface GateInput {
  expectedStatus: DeclaredStatus;
  status: RunStatus;
}

export interface LedgerSummary {
  expectedPassMatches: number;
  expectedPassCount: number;
  knownFailureCount: number;
  knownFailuresStillFailing: number;
  knownFailuresCleared: number;
  unexpectedFailureCount: number;
  gatePass: boolean;
}

export interface LedgerRunResult {
  id: string;
  expectedStatus: DeclaredStatus;
  status: RunStatus;
  elapsedMs: number;
  comparison?: MetricComparison;
  detail?: string;
}

interface OracleExpectedFile {
  source?: unknown;
  method?: unknown;
  body_count?: unknown;
  volume_mm3?: unknown;
  area_mm2?: unknown;
  center_of_mass?: unknown;
  bbox?: { min?: unknown; max?: unknown };
  faces?: unknown;
  note?: unknown;
  compare?: unknown;
  tolerance?: unknown;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repositoryRoot, 'assets/reference-parts/solidcraft-ledger.json');
const ledgerPath = resolve(repositoryRoot, 'docs/solidcraft-ledger.md');
const casesRoot = resolve(repositoryRoot, 'assets/reference-parts/solidcraft/cases');
const corpusRoot = resolve(repositoryRoot, 'assets/reference-parts/solidcraft');

export function sameOracleNumber(a: number, b: number): boolean {
  if (a === b) return true;
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a));
}

export function bboxDiagonal(bbox: SolidCraftExpected['bbox']): number {
  return Math.hypot(
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  );
}

export function effectiveTolerances(expected: SolidCraftExpected, spec: ToleranceSpec): EffectiveTolerances {
  const diagonal = bboxDiagonal(expected.bbox);
  return {
    volumeRelative: spec.volumeRelative,
    surfaceAreaRelative: spec.surfaceAreaRelative,
    bboxAbsoluteMm: Math.max(spec.bboxAbsoluteFloorMm, spec.bboxRelativeOfDiagonal * diagonal),
    centerOfMassAbsoluteMm: Math.max(
      spec.centerOfMassAbsoluteFloorMm,
      spec.centerOfMassRelativeOfDiagonal * diagonal,
    ),
  };
}

function componentError(actual: readonly number[], expected: readonly number[]): number {
  let max = 0;
  for (let i = 0; i < expected.length; i++) max = Math.max(max, Math.abs(actual[i] - expected[i]));
  return max;
}

export function compareSolidCraftMetrics(
  actual: SolidCraftActual,
  expected: SolidCraftExpected,
  tolerances: EffectiveTolerances,
): MetricComparison {
  const volumeRelativeError = (actual.volumeMm3 - expected.volumeMm3) / expected.volumeMm3;
  const surfaceAreaRelativeError = (actual.surfaceAreaMm2 - expected.surfaceAreaMm2) / expected.surfaceAreaMm2;
  const bboxMaxAbsoluteErrorMm = Math.max(
    componentError(actual.bbox.min, expected.bbox.min),
    componentError(actual.bbox.max, expected.bbox.max),
  );
  const centerOfMassMaxAbsoluteErrorMm = componentError(actual.centerOfMass, expected.centerOfMass);
  const volumePass = Math.abs(volumeRelativeError) <= tolerances.volumeRelative;
  const surfaceAreaPass = Math.abs(surfaceAreaRelativeError) <= tolerances.surfaceAreaRelative;
  const bboxPass = bboxMaxAbsoluteErrorMm <= tolerances.bboxAbsoluteMm;
  const centerOfMassPass = centerOfMassMaxAbsoluteErrorMm <= tolerances.centerOfMassAbsoluteMm;
  return {
    pass: volumePass && surfaceAreaPass && bboxPass && centerOfMassPass,
    volumePass,
    surfaceAreaPass,
    bboxPass,
    centerOfMassPass,
    volumeRelativeError,
    surfaceAreaRelativeError,
    bboxMaxAbsoluteErrorMm,
    centerOfMassMaxAbsoluteErrorMm,
  };
}

/** Gate the cases that were actually built. Pending rows are not results and do not fail the run. */
export function summarizeLedger(results: readonly GateInput[]): LedgerSummary {
  const executed = results.filter((result) => result.expectedStatus !== 'pending');
  const expectedPass = executed.filter((result) => result.expectedStatus === 'pass');
  const expectedPassMatches = expectedPass.filter((result) => result.status === 'PASS').length;
  const known = executed.filter((result) => result.expectedStatus === 'known-failure');
  const knownFailuresStillFailing = known.filter((result) => result.status === 'KNOWN FAIL').length;
  const knownFailuresCleared = known.filter((result) => result.status === 'PASS').length;
  const unexpectedFailureCount = executed.filter((result) => result.status === 'FAIL').length;
  return {
    expectedPassMatches,
    expectedPassCount: expectedPass.length,
    knownFailureCount: known.length,
    knownFailuresStillFailing,
    knownFailuresCleared,
    unexpectedFailureCount,
    gatePass: expectedPassMatches === expectedPass.length && unexpectedFailureCount === 0,
  };
}

export function selectCases(cases: readonly LedgerCase[], tier: 'pr' | 'all'): LedgerCase[] {
  return cases.filter((entry) => {
    if (entry.status === 'pending' || !entry.source) return false;
    if (tier === 'pr') return entry.ci === 'pr';
    return true;
  });
}

export function corpusMismatch(manifestIds: readonly string[], diskIds: readonly string[]): string | undefined {
  const onDisk = new Set(diskIds);
  const declared = new Set(manifestIds);
  const missingFiles = manifestIds.filter((id) => !onDisk.has(id));
  const missingRows = diskIds.filter((id) => !declared.has(id));
  if (missingFiles.length === 0 && missingRows.length === 0) return undefined;
  return `manifest/corpus mismatch: missing files [${missingFiles.join(', ')}]; missing rows [${missingRows.join(', ')}]`;
}

export function unsupportedOracleFields(exp: { tolerance?: unknown; compare?: unknown }): string | undefined {
  if (exp.tolerance !== undefined) return 'per-case tolerance';
  if (exp.compare !== undefined) return 'compare subset';
  return undefined;
}

export function assertRunLimits(limits: LedgerLimits): void {
  if (!(limits.perPartMs > 0 && limits.perPartMs <= 20000)) {
    throw new Error('PR per-part budget must be positive and at most 20000 ms');
  }
  if (!(limits.prTotalMs > 0 && limits.prTotalMs <= 60000)) {
    throw new Error('PR SolidCraft ledger budget must be positive and at most 60000 ms');
  }
  if (!(limits.nightlyPerPartMs >= limits.perPartMs && limits.nightlyTotalMs > limits.prTotalMs)) {
    throw new Error('nightly SolidCraft limits must be looser than the PR limits');
  }
}

function finiteTriple(value: unknown, label: string): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    throw new Error(`${label} must be three finite numbers`);
  }
  return [value[0], value[1], value[2]];
}

function validateCase(entry: LedgerCase): void {
  if (!entry.id?.trim()) throw new Error('a ledger case is missing an id');
  if (!entry.name?.trim()) throw new Error(`${entry.id} is missing a name`);
  if (entry.ci !== 'pr' && entry.ci !== 'nightly') throw new Error(`${entry.id} has an unsupported ci tier`);
  if (entry.status !== 'pass' && entry.status !== 'known-failure' && entry.status !== 'pending') {
    throw new Error(`${entry.id} has an unsupported status`);
  }
  if (entry.status === 'pending' && entry.source) {
    throw new Error(`${entry.id} is pending and must not declare a kernelCAD source`);
  }
  if (entry.status !== 'pending' && !entry.source?.endsWith('.kcad.ts')) {
    throw new Error(`${entry.id} needs a .kcad.ts source`);
  }
  if (entry.status === 'known-failure' && !entry.knownFailureReason?.trim()) {
    throw new Error(`${entry.id} is marked known-failure without a reason`);
  }
  if (entry.status !== 'known-failure' && entry.knownFailureReason) {
    throw new Error(`${entry.id} records a known-failure reason without that status`);
  }
  if (!(entry.expected.volumeMm3 > 0) || !(entry.expected.surfaceAreaMm2 > 0)) {
    throw new Error(`${entry.id} expected volume and area must be positive`);
  }
  finiteTriple(entry.expected.centerOfMass, `${entry.id} centre of mass`);
  finiteTriple(entry.expected.bbox.min, `${entry.id} bbox min`);
  finiteTriple(entry.expected.bbox.max, `${entry.id} bbox max`);
  if (entry.expected.bbox.min.some((value, axis) => value > entry.expected.bbox.max[axis])) {
    throw new Error(`${entry.id} expected bbox min must not exceed max`);
  }
  if (entry.provenance?.kind !== 'analytic' && entry.provenance?.kind !== 'freecad') {
    throw new Error(`${entry.id} provenance must be analytic or freecad`);
  }
  if (!entry.provenance.details?.trim() || !entry.provenance.upstream?.trim()) {
    throw new Error(`${entry.id} must record the SolidCraft method and source`);
  }
  if (!(entry.bodyCount > 0) || !Number.isInteger(entry.bodyCount)) {
    throw new Error(`${entry.id} bodyCount must be a positive integer`);
  }
}

/** The pin is deliberate: every attribution file must name the same commit and the upstream URL. */
export function attributionGaps(
  files: readonly { label: string; text: string }[],
  commit: string,
  url: string,
): string[] {
  const gaps: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(commit)) gaps.push('manifest commit is not a 40-character SHA');
  for (const file of files) {
    if (!file.text.includes(commit)) gaps.push(`${file.label} is missing the pinned commit`);
    if (!file.text.includes(url)) gaps.push(`${file.label} is missing the source URL`);
  }
  return gaps;
}

export function validateManifest(manifest: LedgerManifest): void {
  if (manifest.schemaVersion !== 1) throw new Error('solidcraft ledger manifest has an unsupported schema');
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    throw new Error('solidcraft ledger manifest has no cases');
  }
  if (!manifest.source) throw new Error('solidcraft ledger manifest is missing source');
  if (!/^https:\/\/github\.com\/tangency-labs\/solidcraft/.test(manifest.source.url)) {
    throw new Error('solidcraft ledger must name the SolidCraft GitHub repository');
  }
  if (manifest.source.license !== 'Apache-2.0') throw new Error('solidcraft ledger must record the Apache-2.0 terms');
  const spec = manifest.tolerances;
  if (![spec.volumeRelative, spec.surfaceAreaRelative, spec.bboxAbsoluteFloorMm, spec.bboxRelativeOfDiagonal,
    spec.centerOfMassAbsoluteFloorMm, spec.centerOfMassRelativeOfDiagonal].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('solidcraft tolerances must be positive finite values');
  }
  if (!spec.notes?.trim()) throw new Error('solidcraft tolerances need a note that records how they were chosen');
  assertRunLimits(manifest.limits);
  const ids = new Set<string>();
  for (const entry of manifest.cases) {
    if (ids.has(entry.id)) throw new Error(`duplicate solidcraft case id: ${entry.id}`);
    ids.add(entry.id);
    validateCase(entry);
  }
}

function numbersMatch(actual: readonly number[], expected: readonly number[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => sameOracleNumber(value, expected[index]));
}

function oracleExpected(file: OracleExpectedFile, id: string): {
  expected: SolidCraftExpected;
  provenance: LedgerCase['provenance'];
  bodyCount: number;
  faces?: number;
  note?: string;
} {
  const unsupported = unsupportedOracleFields(file);
  if (unsupported) throw new Error(`${id} expected.json has a ${unsupported}; record it in the manifest before comparing`);
  const upstream = typeof file.source === 'string' ? file.source : '';
  const kind = upstream === 'analytic' ? 'analytic' : upstream.startsWith('freecad') ? 'freecad' : undefined;
  if (!kind) throw new Error(`${id} expected.json source must be analytic or freecad`);
  const details = typeof file.method === 'string' ? file.method : '';
  if (!details.trim()) throw new Error(`${id} expected.json is missing a method`);
  const volumeMm3 = file.volume_mm3;
  const surfaceAreaMm2 = file.area_mm2;
  if (typeof volumeMm3 !== 'number' || typeof surfaceAreaMm2 !== 'number') {
    throw new Error(`${id} expected.json volume and area must be numbers`);
  }
  const centerOfMass = finiteTriple(file.center_of_mass, `${id} expected.json centre of mass`);
  const bbox = {
    min: finiteTriple(file.bbox?.min, `${id} expected.json bbox min`),
    max: finiteTriple(file.bbox?.max, `${id} expected.json bbox max`),
  };
  if (typeof file.body_count !== 'number' || !Number.isInteger(file.body_count) || file.body_count <= 0) {
    throw new Error(`${id} expected.json body_count must be a positive integer`);
  }
  const faces = file.faces === undefined ? undefined : file.faces;
  if (faces !== undefined && (typeof faces !== 'number' || !Number.isInteger(faces) || faces <= 0)) {
    throw new Error(`${id} expected.json faces must be a positive integer when present`);
  }
  const note = file.note === undefined ? undefined : file.note;
  if (note !== undefined && typeof note !== 'string') throw new Error(`${id} expected.json note must be a string`);
  return {
    expected: { volumeMm3, surfaceAreaMm2, centerOfMass, bbox },
    provenance: { kind, upstream, details },
    bodyCount: file.body_count,
    ...(faces === undefined ? {} : { faces }),
    ...(note === undefined ? {} : { note }),
  };
}

function expectSameCaseOracle(entry: LedgerCase, oracle: ReturnType<typeof oracleExpected>): void {
  const metrics = [
    [entry.expected.volumeMm3, oracle.expected.volumeMm3, 'volume'],
    [entry.expected.surfaceAreaMm2, oracle.expected.surfaceAreaMm2, 'area'],
  ] as const;
  for (const [manifestValue, oracleValue, label] of metrics) {
    if (!sameOracleNumber(manifestValue, oracleValue)) {
      throw new Error(`${entry.id} manifest ${label} does not match vendored expected.json`);
    }
  }
  if (!numbersMatch(entry.expected.centerOfMass, oracle.expected.centerOfMass)
    || !numbersMatch(entry.expected.bbox.min, oracle.expected.bbox.min)
    || !numbersMatch(entry.expected.bbox.max, oracle.expected.bbox.max)) {
    throw new Error(`${entry.id} manifest bbox or centre of mass does not match vendored expected.json`);
  }
  if (entry.provenance.kind !== oracle.provenance.kind
    || entry.provenance.upstream !== oracle.provenance.upstream
    || entry.provenance.details !== oracle.provenance.details
    || entry.bodyCount !== oracle.bodyCount
    || entry.faces !== oracle.faces
    || entry.note !== oracle.note) {
    throw new Error(`${entry.id} manifest provenance does not match vendored expected.json`);
  }
}

export async function loadLedger(): Promise<LedgerManifest> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as LedgerManifest;
  validateManifest(manifest);
  const attribution = await Promise.all([
    ['assets/reference-parts/solidcraft/SOURCE.txt', resolve(corpusRoot, 'SOURCE.txt')],
    ['assets/reference-parts/solidcraft/NOTICE', resolve(corpusRoot, 'NOTICE')],
    ['NOTICE', resolve(repositoryRoot, 'NOTICE')],
    ['ATTRIBUTION.md', resolve(repositoryRoot, 'ATTRIBUTION.md')],
  ].map(async ([label, path]) => ({ label, text: await readFile(path, 'utf8') })));
  const gaps = attributionGaps(attribution, manifest.source.commit, manifest.source.url);
  if (gaps.length > 0) throw new Error(gaps.join('; '));
  const license = await readFile(resolve(corpusRoot, 'LICENSE-APACHE'), 'utf8');
  if (!license.includes('Apache License') || !license.includes('Version 2.0')) {
    throw new Error('LICENSE-APACHE beside the vendored oracle is missing the Apache-2.0 text');
  }
  const diskIds = (await readdir(casesRoot)).filter((name) => !name.startsWith('.')).sort();
  const mismatch = corpusMismatch(manifest.cases.map((entry) => entry.id), diskIds);
  if (mismatch) throw new Error(mismatch);
  for (const entry of manifest.cases) {
    const oracle = oracleExpected(
      JSON.parse(await readFile(resolve(casesRoot, entry.id, 'expected.json'), 'utf8')) as OracleExpectedFile,
      entry.id,
    );
    expectSameCaseOracle(entry, oracle);
    await readFile(resolve(casesRoot, entry.id, 'recipe.json'), 'utf8');
    if (entry.source) await readFile(resolve(repositoryRoot, entry.source), 'utf8');
  }
  return manifest;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  const percent = value * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(4)}%`;
}

function formatMillimetres(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(3)} mm`;
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function resultLabel(entry: LedgerCase, result: LedgerRunResult | undefined): string {
  if (!result) return entry.status === 'pending' ? 'PENDING' : 'NOT RUN';
  if (entry.status === 'known-failure' && result.status === 'PASS') return 'PASS — cleared; promote';
  return result.status;
}

export function renderLedger(manifest: LedgerManifest, results: readonly LedgerRunResult[]): string {
  const summary = summarizeLedger(results.map((result) => ({
    expectedStatus: result.expectedStatus,
    status: result.status,
  })));
  const byId = new Map(results.map((result) => [result.id, result]));
  const lines = [
    '# SolidCraft oracle ledger',
    '',
    `**Gate:** ${summary.gatePass ? 'PASS' : 'FAIL'}. Unexpected failures: ${summary.unexpectedFailureCount}. Known failures executed: ${summary.knownFailureCount}; still failing ${summary.knownFailuresStillFailing}; cleared for promotion ${summary.knownFailuresCleared}.`,
    '',
    `SolidCraft (${manifest.source.url}) commit \`${manifest.source.commit}\` (${manifest.source.committedAt}). ${manifest.source.licenseNote}`,
    '',
    manifest.tolerances.notes,
    '',
    'The table lists every vendored case. PENDING rows have no kernelCAD source and are not failures. NOT RUN rows are implemented outside this PR tier; the nightly job builds them. Measurements below are from the PR tier only, so this file does not lock a pass-count baseline and does not change when the nightly job runs.',
    '',
    'Regenerate with `npm run solidcraft-ledger:regenerate`. PR CI runs `npm run test:solidcraft-ledger`. The full implemented set runs with `npm run test:solidcraft-ledger:all`. Face counts are kept in the vendored expected.json files and are not gated.',
    '',
    'To bump the pin, follow `assets/reference-parts/solidcraft/SOURCE.txt`.',
    '',
    '| Case | Name | CI | Declared | Δ volume | Δ area | Δ bbox | Δ CoM | Result |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const entry of manifest.cases) {
    const result = byId.get(entry.id);
    lines.push(
      `| ${cell(entry.id)} | ${cell(entry.name)} | ${entry.ci} | ${entry.status} | ${formatPercent(result?.comparison?.volumeRelativeError)} | ${formatPercent(result?.comparison?.surfaceAreaRelativeError)} | ${formatMillimetres(result?.comparison?.bboxMaxAbsoluteErrorMm)} | ${formatMillimetres(result?.comparison?.centerOfMassMaxAbsoluteErrorMm)} | ${resultLabel(entry, result)} |`,
    );
  }
  const known = manifest.cases.filter((entry) => entry.status === 'known-failure');
  lines.push('', '## Known failures', '');
  if (known.length === 0) lines.push('None declared.');
  else {
    for (const entry of known) {
      const result = byId.get(entry.id);
      const state = !result
        ? 'not in this run'
        : result.status === 'PASS'
          ? 'cleared; promote'
          : result.status === 'KNOWN FAIL'
            ? 'still failing'
            : 'evaluation failed';
      lines.push(`- **${entry.id}**: ${state}. Reason: ${entry.knownFailureReason}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(task: Promise<T>, limitMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${limitMs} ms`)), limitMs);
  });
  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}

async function runCase(entry: LedgerCase, manifest: LedgerManifest, perPartMs: number): Promise<LedgerRunResult> {
  const start = performance.now();
  let model: Awaited<ReturnType<typeof buildModelFromFile>> | undefined;
  try {
    model = await withTimeout(
      buildModelFromFile({ file: resolve(repositoryRoot, entry.source!), kernel: 'occt' }),
      perPartMs,
      entry.id,
    );
    const buildErrors = model.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (buildErrors.length > 0) throw new Error(buildErrors.map((diagnostic) => diagnostic.message).join('; '));
    if (!model.rootShape || model.rootShape.isEmpty()) throw new Error('the model did not produce a non-empty root solid');
    const mass = model.rootShape.massProperties();
    const actual: SolidCraftActual = {
      volumeMm3: model.rootShape.volume(),
      surfaceAreaMm2: model.rootShape.surfaceArea(),
      centerOfMass: [mass.com[0], mass.com[1], mass.com[2]],
      bbox: model.rootShape.boundingBox({ exact: true }),
    };
    if (![actual.volumeMm3, actual.surfaceAreaMm2, ...actual.centerOfMass, ...actual.bbox.min, ...actual.bbox.max].every(Number.isFinite)) {
      throw new Error('the OCCT backend returned a non-finite metric');
    }
    const comparison = compareSolidCraftMetrics(actual, entry.expected, effectiveTolerances(entry.expected, manifest.tolerances));
    const elapsedMs = performance.now() - start;
    const withinBudget = elapsedMs <= perPartMs;
    const status: RunStatus = !withinBudget
      ? 'FAIL'
      : comparison.pass
        ? 'PASS'
        : entry.status === 'known-failure'
          ? 'KNOWN FAIL'
          : 'FAIL';
    const detail = withinBudget ? undefined : `part budget exceeded (${elapsedMs.toFixed(1)} ms > ${perPartMs} ms)`;
    return { id: entry.id, expectedStatus: entry.status, elapsedMs, comparison, status, ...(detail ? { detail } : {}) };
  } catch (error) {
    return {
      id: entry.id,
      expectedStatus: entry.status,
      elapsedMs: performance.now() - start,
      status: 'FAIL',
      detail: errorMessage(error),
    };
  } finally {
    model?.rootShape?.dispose?.();
  }
}

function parseArgs(argv: readonly string[]): { mode: 'check' | 'write'; tier: 'pr' | 'all' } {
  let mode: 'check' | 'write' = 'check';
  let tier: 'pr' | 'all' = 'pr';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') mode = 'check';
    else if (arg === '--write') mode = 'write';
    else if (arg === '--tier') {
      const value = argv[++i];
      if (value !== 'pr' && value !== 'all') throw new Error('usage: solidcraftLedger.ts [--check|--write] [--tier pr|all]');
      tier = value;
    } else {
      throw new Error('usage: solidcraftLedger.ts [--check|--write] [--tier pr|all]');
    }
  }
  if (mode === 'write' && tier !== 'pr') {
    throw new Error('--write records the PR-tier ledger. Nightly checks use --check --tier all and do not rewrite the doc.');
  }
  return { mode, tier };
}

async function main(): Promise<number> {
  const { mode, tier } = parseArgs(process.argv.slice(2));
  const manifest = await loadLedger();
  const selected = selectCases(manifest.cases, tier);
  const perPartMs = tier === 'pr' ? manifest.limits.perPartMs : manifest.limits.nightlyPerPartMs;
  const totalMs = tier === 'pr' ? manifest.limits.prTotalMs : manifest.limits.nightlyTotalMs;
  const totalStart = performance.now();
  const totalWatchdog = setTimeout(() => {
    console.error(`SolidCraft ledger exceeded ${totalMs} ms total budget.`);
    process.exit(1);
  }, totalMs);
  const results: LedgerRunResult[] = [];
  let hardTimeout = false;
  try {
    for (const entry of selected) {
      const result = await runCase(entry, manifest, perPartMs);
      results.push(result);
      const comparison = result.comparison;
      console.log(
        `${result.id.padEnd(32)} ${comparison
          ? `ΔV ${formatPercent(comparison.volumeRelativeError)}  ΔA ${formatPercent(comparison.surfaceAreaRelativeError)}  Δbbox ${formatMillimetres(comparison.bboxMaxAbsoluteErrorMm)}  ΔCoM ${formatMillimetres(comparison.centerOfMassMaxAbsoluteErrorMm)}`
          : result.detail ?? 'no metrics'}  ${result.status.padEnd(10)} ${result.elapsedMs.toFixed(1)} ms`,
      );
      if (result.elapsedMs > perPartMs) {
        hardTimeout = true;
        break;
      }
      if (performance.now() - totalStart > totalMs) break;
    }
  } finally {
    clearTimeout(totalWatchdog);
  }

  const elapsedBeforeReport = performance.now() - totalStart;
  if (results.length !== selected.length || elapsedBeforeReport > totalMs) {
    console.error(`Incomplete SolidCraft ledger run (${results.length}/${selected.length} executed cases, ${elapsedBeforeReport.toFixed(1)} ms); refusing to write or compare a partial report.`);
    return 1;
  }

  const pending = manifest.cases.filter((entry) => entry.status === 'pending').length;
  const notRun = manifest.cases.length - pending - selected.length;
  console.log(`Executed ${selected.length} implemented cases for tier ${tier}. Pending rows left unbuilt: ${pending}. Implemented cases outside this tier: ${notRun}.`);

  let ledgerCurrent = true;
  if (tier === 'pr') {
    const markdown = renderLedger(manifest, results);
    if (mode === 'write') {
      await writeFile(ledgerPath, markdown, 'utf8');
      console.log(`Wrote ${ledgerPath}`);
    } else {
      const committed = await readFile(ledgerPath, 'utf8').catch(() => '');
      if (committed !== markdown) {
        console.error('Committed SolidCraft ledger is stale. Run npm run solidcraft-ledger:regenerate and review the diff.');
        ledgerCurrent = false;
      }
    }
  }

  const summary = summarizeLedger(results);
  const elapsedTotal = performance.now() - totalStart;
  console.log(`Gate ${summary.gatePass ? 'PASS' : 'FAIL'}. Unexpected failures: ${summary.unexpectedFailureCount}. Known failures executed: ${summary.knownFailureCount}; still failing ${summary.knownFailuresStillFailing}; cleared ${summary.knownFailuresCleared}. Total ${elapsedTotal.toFixed(1)} ms / ${totalMs} ms.`);
  if (hardTimeout) process.exit(1);
  return !summary.gatePass || !ledgerCurrent || elapsedTotal > totalMs ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
