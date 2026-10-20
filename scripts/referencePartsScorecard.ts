import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { buildModelFromFile } from '../src/modeling/buildModel';

export interface ReferenceMetrics {
  volumeMm3: number;
  surfaceAreaMm2: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export interface ReferenceTolerances {
  volumeRelative: number;
  surfaceAreaRelative: number;
  bboxAbsoluteMm: number;
}

export interface MetricComparison {
  pass: boolean;
  volumePass: boolean;
  surfaceAreaPass: boolean;
  bboxPass: boolean;
  volumeRelativeError: number;
  surfaceAreaRelativeError: number;
  bboxMaxAbsoluteErrorMm: number;
}

interface ReferencePart {
  id: string;
  name: string;
  source: string;
  expected: ReferenceMetrics;
  tolerance: ReferenceTolerances;
  provenance: { kind: 'analytic' | 'occt-local' | 'mixed'; details: string };
  status: 'pass' | 'known-failure';
  knownFailureReason?: string;
}

interface ReferenceCorpus {
  schemaVersion: 1;
  limits: { perPartMs: number; totalMs: number };
  parts: ReferencePart[];
}

interface PartResult {
  part: ReferencePart;
  elapsedMs: number;
  actual?: ReferenceMetrics;
  comparison?: MetricComparison;
  status: 'PASS' | 'KNOWN FAIL' | 'FAIL';
  detail?: string;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repositoryRoot, 'assets/reference-parts/scorecard.json');
const scorecardPath = resolve(repositoryRoot, 'docs/reference-parts-scorecard.md');

export function compareMetrics(
  actual: ReferenceMetrics,
  expected: ReferenceMetrics,
  tolerances: ReferenceTolerances,
): MetricComparison {
  const volumeRelativeError = (actual.volumeMm3 - expected.volumeMm3) / expected.volumeMm3;
  const surfaceAreaRelativeError =
    (actual.surfaceAreaMm2 - expected.surfaceAreaMm2) / expected.surfaceAreaMm2;
  const bboxMaxAbsoluteErrorMm = Math.max(
    ...actual.bbox.min.map((value, axis) => Math.abs(value - expected.bbox.min[axis])),
    ...actual.bbox.max.map((value, axis) => Math.abs(value - expected.bbox.max[axis])),
  );
  const volumePass = Math.abs(volumeRelativeError) <= tolerances.volumeRelative;
  const surfaceAreaPass = Math.abs(surfaceAreaRelativeError) <= tolerances.surfaceAreaRelative;
  const bboxPass = bboxMaxAbsoluteErrorMm <= tolerances.bboxAbsoluteMm;

  return {
    pass: volumePass && surfaceAreaPass && bboxPass,
    volumePass,
    surfaceAreaPass,
    bboxPass,
    volumeRelativeError,
    surfaceAreaRelativeError,
    bboxMaxAbsoluteErrorMm,
  };
}

function formatPercent(value: number | undefined): string {
  if (value === undefined) return '—';
  const percent = value * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(4)}%`;
}

function formatMillimetres(value: number | undefined): string {
  return value === undefined ? '—' : `${value.toFixed(3)} mm`;
}

function resultStatus(result: PartResult): string {
  if (result.status === 'KNOWN FAIL') {
    return `KNOWN FAIL — ${result.part.knownFailureReason ?? 'reason recorded in manifest'}`;
  }
  return result.status;
}

export function renderScorecard(results: readonly PartResult[]): string {
  const passing = results.filter((result) => result.status === 'PASS').length;
  const knownFailures = results.filter((result) => result.status === 'KNOWN FAIL').length;
  const unexpectedFailures = results.filter((result) => result.status === 'FAIL').length;
  const expectedPassing = results.filter((result) => result.part.status === 'pass').length;
  const lines = [
    '# Reference parts scorecard',
    '',
    `**Result:** ${passing} / ${expectedPassing} expected-pass parts match; ${knownFailures} known failure(s); ${unexpectedFailures} unexpected failure(s).`,
    '',
    'This deterministic report compares native `.kcad.ts` models against the values and provenance in `assets/reference-parts/scorecard.json`. The runner uses kernelCAD’s OCCT backend. Per-part timings are printed by the command and omitted here so regeneration stays stable across machines. See the [local validation demo bundle](demos/reference-parts-scorecard/README.md).',
    '',
    'Regenerate with `npm run reference-parts:regenerate`; CI runs the same geometry checks and verifies this file is current with `npm run test:reference-parts`.',
    '',
    '| Part | Δ volume | Δ surface area | Max Δ bbox | Result |',
    '| --- | ---: | ---: | ---: | --- |',
  ];

  for (const result of results) {
    lines.push(
      `| ${result.part.name} | ${formatPercent(result.comparison?.volumeRelativeError)} | ${formatPercent(result.comparison?.surfaceAreaRelativeError)} | ${formatMillimetres(result.comparison?.bboxMaxAbsoluteErrorMm)} | ${resultStatus(result)} |`,
    );
  }

  lines.push('', '## Provenance', '');
  for (const part of results.map((result) => result.part)) {
    lines.push(`- **${part.name}** (${part.provenance.kind}): ${part.provenance.details}`);
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

async function runPart(part: ReferencePart, perPartMs: number): Promise<PartResult> {
  const start = performance.now();
  let model: Awaited<ReturnType<typeof buildModelFromFile>> | undefined;
  try {
    model = await withTimeout(
      buildModelFromFile({ file: resolve(repositoryRoot, part.source), kernel: 'occt' }),
      perPartMs,
      part.id,
    );
    const buildErrors = model.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (buildErrors.length > 0) {
      throw new Error(buildErrors.map((diagnostic) => diagnostic.message).join('; '));
    }
    if (!model.rootShape || model.rootShape.isEmpty()) {
      throw new Error('the model did not produce a non-empty root solid');
    }
    const actual: ReferenceMetrics = {
      volumeMm3: model.rootShape.volume(),
      surfaceAreaMm2: model.rootShape.surfaceArea(),
      bbox: model.rootShape.boundingBox({ exact: true }),
    };
    if (![actual.volumeMm3, actual.surfaceAreaMm2, ...actual.bbox.min, ...actual.bbox.max].every(Number.isFinite)) {
      throw new Error('the OCCT backend returned a non-finite metric');
    }
    const comparison = compareMetrics(actual, part.expected, part.tolerance);
    const elapsedMs = performance.now() - start;
    const withinBudget = elapsedMs <= perPartMs;
    const status = !withinBudget
      ? 'FAIL'
      : comparison.pass
        ? 'PASS'
        : part.status === 'known-failure'
          ? 'KNOWN FAIL'
          : 'FAIL';
    const detail = withinBudget ? undefined : `part budget exceeded (${elapsedMs.toFixed(1)} ms > ${perPartMs} ms)`;
    return { part, elapsedMs, actual, comparison, status, ...(detail ? { detail } : {}) };
  } catch (error) {
    const elapsedMs = performance.now() - start;
    return {
      part,
      elapsedMs,
      status: 'FAIL',
      detail: errorMessage(error),
    };
  } finally {
    // The returned root owns a BRep. Intermediate script records can include
    // sketch placeholders whose backend wrapper intentionally has no BRep.
    model?.rootShape?.dispose?.();
  }
}

async function loadCorpus(): Promise<ReferenceCorpus> {
  const corpus = JSON.parse(await readFile(manifestPath, 'utf8')) as ReferenceCorpus;
  if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.parts) || corpus.parts.length === 0) {
    throw new Error('reference-parts manifest has an unsupported schema or no parts');
  }
  if (!Number.isFinite(corpus.limits.perPartMs) || !Number.isFinite(corpus.limits.totalMs)
    || corpus.limits.perPartMs <= 0 || corpus.limits.totalMs <= 0
    || corpus.limits.perPartMs > 5000 || corpus.limits.totalMs > 60000) {
    throw new Error('reference-parts manifest limits must stay at or below 5000 ms per part and 60000 ms total');
  }
  const ids = new Set<string>();
  for (const part of corpus.parts) {
    if (ids.has(part.id)) throw new Error(`duplicate reference part id: ${part.id}`);
    ids.add(part.id);
    if (part.status !== 'pass' && part.status !== 'known-failure') {
      throw new Error(`${part.id} has an unsupported status`);
    }
    if (part.status === 'known-failure' && !part.knownFailureReason?.trim()) {
      throw new Error(`${part.id} is marked known-failure without a reason`);
    }
    if (!part.source.endsWith('.kcad.ts')) throw new Error(`${part.id} source must be a .kcad.ts model`);
    if (!['analytic', 'occt-local', 'mixed'].includes(part.provenance?.kind)) {
      throw new Error(`${part.id} must declare supported metric provenance`);
    }
    if (!part.provenance?.details?.trim()) throw new Error(`${part.id} must record metric provenance`);
    if (![part.expected.volumeMm3, part.expected.surfaceAreaMm2].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error(`${part.id} expected volume and area must be positive finite values`);
    }
    if (![...part.expected.bbox.min, ...part.expected.bbox.max].every(Number.isFinite)) {
      throw new Error(`${part.id} expected bbox must contain finite coordinates`);
    }
    if (part.expected.bbox.min.some((value, axis) => value > part.expected.bbox.max[axis])) {
      throw new Error(`${part.id} expected bbox min must not exceed max`);
    }
    if (![part.tolerance.volumeRelative, part.tolerance.surfaceAreaRelative, part.tolerance.bboxAbsoluteMm].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error(`${part.id} tolerances must be positive finite values`);
    }
  }
  return corpus;
}

async function main(): Promise<number> {
  const mode = process.argv[2] ?? '--check';
  if (mode !== '--check' && mode !== '--write') {
    throw new Error('usage: referencePartsScorecard.ts [--check|--write]');
  }

  const corpus = await loadCorpus();
  const totalStart = performance.now();
  const totalWatchdog = setTimeout(() => {
    console.error(`Reference-parts scorecard exceeded ${corpus.limits.totalMs} ms total budget.`);
    process.exit(1);
  }, corpus.limits.totalMs);
  const results: PartResult[] = [];
  let hardTimeout = false;

  try {
    for (const part of corpus.parts) {
      const result = await runPart(part, corpus.limits.perPartMs);
      results.push(result);
      const comparison = result.comparison;
      console.log(
        `${result.part.id.padEnd(28)} ${comparison ? `ΔV ${formatPercent(comparison.volumeRelativeError)}  ΔA ${formatPercent(comparison.surfaceAreaRelativeError)}  Δbbox ${formatMillimetres(comparison.bboxMaxAbsoluteErrorMm)}` : result.detail ?? 'no metrics'}  ${result.status.padEnd(10)} ${result.elapsedMs.toFixed(1)} ms`,
      );
      if (result.elapsedMs > corpus.limits.perPartMs) {
        hardTimeout = true;
        break;
      }
      if (performance.now() - totalStart > corpus.limits.totalMs) break;
    }
  } finally {
    clearTimeout(totalWatchdog);
  }

  const elapsedBeforeReport = performance.now() - totalStart;
  if (results.length !== corpus.parts.length || elapsedBeforeReport > corpus.limits.totalMs) {
    console.error(
      `Incomplete scorecard run (${results.length}/${corpus.parts.length} parts, ${elapsedBeforeReport.toFixed(1)} ms); refusing to write or compare a partial report.`,
    );
    return 1;
  }

  const markdown = renderScorecard(results);
  if (mode === '--write') {
    await writeFile(scorecardPath, markdown, 'utf8');
    console.log(`Wrote ${scorecardPath}`);
  } else {
    const committed = await readFile(scorecardPath, 'utf8').catch(() => '');
    if (committed !== markdown) {
      console.error('Committed scorecard is stale. Run npm run reference-parts:regenerate and review the diff.');
      results.push({
        part: corpus.parts[0],
        elapsedMs: 0,
        status: 'FAIL',
        detail: 'committed scorecard differs from current deterministic output',
      });
    }
  }

  const failures = results.filter((result) => result.status === 'FAIL');
  const expectedPassCount = corpus.parts.filter((part) => part.status === 'pass').length;
  const passingExpected = results.filter((result) => result.part.status === 'pass' && result.status === 'PASS').length;
  const knownFailures = results.filter((result) => result.status === 'KNOWN FAIL').length;
  const elapsedTotal = performance.now() - totalStart;
  console.log(`Score: ${passingExpected}/${expectedPassCount} expected-pass parts; ${knownFailures} known failure(s); total ${elapsedTotal.toFixed(1)} ms / ${corpus.limits.totalMs} ms.`);
  if (hardTimeout) process.exit(1);
  return failures.length > 0 || passingExpected !== expectedPassCount || elapsedTotal > corpus.limits.totalMs ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
