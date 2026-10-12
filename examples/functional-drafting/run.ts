// Generate only these two article bundles from source, never hand-edit drawings.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { evaluateAndBuildScript } from '../../src/composition/scriptEvaluation';
import { runAndExport, type ExportOptions, type ExportResult } from '../../src/agent/script-runtime/export';
import { initOcct, OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { recogniseDrawingFeatures } from '../../src/kernel/backends/occt/drawingFeatures';
import { drawingDecisionKey } from '../../src/shared/intent/drawingReview';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const near = (value: number, expected: number, epsilon = 1e-5) => assert.ok(Math.abs(value - expected) <= epsilon, `${value} != ${expected} ± ${epsilon}`);
const date = '2026-10-12';
const title = { title: 'Illustrative functional drawing', partName: 'EXAMPLE', material: 'Unspecified - illustration', revision: 'EXAMPLE' };
const base = { sheet: 'a3', projection: 'third', date, modelName: 'Functional drawing example', autoAnnotate: false, ...title } as const;
const placement = {
  'authored:pitch-x': { view: 'top' }, 'authored:pitch-y': { view: 'top' },
  'authored:mounting-diameter': { view: 'top', offset: 4 }, 'authored:bore-diameter': { view: 'top', offset: 20 },
} as const;
const resolution = { note: 'Illustrative insert intended to be removable. Numerical clearance and retention hardware remain outside this exercise.', provenance: 'Tutorial design brief, 2026-10-12; no catalog or physical fit verification.' };

function exported(result: ExportResult, name: string): void {
  assert.ok(result.bytes.length > 0, `${name}: no bytes ${JSON.stringify(result.diagnostics)}`);
  assert.equal(result.diagnostics.filter(d => d.severity === 'error').length, 0, JSON.stringify(result.diagnostics));
}
async function geometry(file: string, out: string): Promise<void> {
  const built = await evaluateAndBuildScript({ file });
  assert.equal(built.evaluation.exitCode, 0); assert.equal(built.evaluation.featureHealth.length, 0);
  const shape = built.model?.rootShape; assert.ok(shape instanceof OcctBackend);
  const analyzer = new (getOC().BRepCheck_Analyzer)(shape.getReplicadShape().wrapped, true, false);
  let valid: boolean; try { valid = analyzer.IsValid_2(); } finally { analyzer.delete(); }
  assert.ok(valid); assert.equal(shape.solidComponents().length, 1);
  const bbox = shape.boundingBox({ exact: true });
  const holes = recogniseDrawingFeatures(shape).holes;
  const plate = file.includes('fixture-plate');
  const expectedBox = plate ? { min: [0, 0, 0], max: [100, 70, 12] } : { min: [0, 0, 0], max: [120, 80, 66] };
  for (const key of ['min', 'max'] as const) bbox[key].forEach((n, i) => near(n, expectedBox[key][i]));
  // R6 plan corners remove 4r² - πr². Counterbore cutters have a real 0.01 mm allowance.
  const expectedVolume = plate
    ? (100 * 70 - 144 + 36 * Math.PI - Math.PI * (4 * 4.5 ** 2 + 15 ** 2)) * 12
    : (120 * 80 - 144 + 36 * Math.PI) * 12 + 56 * 36 * 54
      - 4 * Math.PI * (4.5 ** 2 * 12 + (7.5 ** 2 - 4.5 ** 2) * 5.01)
      - Math.PI * (16 ** 2 * 36 + (22 ** 2 - 16 ** 2) * 8.01);
  near(shape.volume(), expectedVolume, 0.01);
  const mounting = holes.filter(h => Math.abs(h.diameter - 9) < 1e-5);
  assert.equal(mounting.length, 4);
  const expectedCentres = plate ? [[12,12], [88,12], [12,58], [88,58]] : [[14,14], [106,14], [14,66], [106,66]];
  for (const [x, y] of expectedCentres) assert.ok(mounting.some(h => Math.abs(h.entry[0] - x) < 1e-5 && Math.abs(h.entry[1] - y) < 1e-5));
  if (plate) {
    const bore = holes.find(h => Math.abs(h.diameter - 30) < 1e-5); assert.ok(bore); near(bore.entry[0], 50); near(bore.entry[1], 35);
  } else {
    const bore = holes.find(h => Math.abs(h.diameter - 32) < 1e-5); assert.ok(bore?.counterbore); near(bore.counterbore.diameter, 44); near(bore.counterbore.depth, 8.01); near(bore.entry[0], 60); near(bore.entry[2], 39);
    for (const hole of mounting) { assert.ok(hole.counterbore); near(hole.counterbore.diameter, 15); near(hole.counterbore.depth, 5.01); }
  }
  await writeFile(out, json({ sourceSha256: sha(await readFile(file)), brepValid: valid, connectedSolidCount: 1, boundingBox: bbox, volumeMm3: shape.volume(), expectedVolumeMm3: expectedVolume, holes, evaluation: built.evaluation,
    limits: ['Geometric checks only; no fit, tolerance, manufacture or load acceptance.', 'Counterbore measurement includes the source API boolean cutter allowance.'] }));
}

async function makeCase(out: string, name: string, source: string, changes: Record<string, unknown>, expectedStatus: string, requiredStatus?: string): Promise<void> {
  const file = resolve(HERE, source); const code = await readFile(file, 'utf8');
  await writeFile(resolve(out, source), code);
  const shared = { ...base, ...changes };
  const options = {
    svg: { ...shared, format: 'svg-drawing', pdfSheet: true, titleBlock: title },
    pdf: { ...shared, format: 'pdf-drawing' },
  };
  await writeFile(resolve(out, `${name}.options.json`), json(options));
  const input = { code, fileName: file, scriptDir: HERE };
  const svg = await runAndExport({ ...input, format: 'svg-drawing', options: options.svg as ExportOptions }); exported(svg, name);
  const pdf = await runAndExport({ ...input, format: 'pdf-drawing', options: options.pdf as ExportOptions }); exported(pdf, name);
  assert.deepEqual(svg.drawingReport, pdf.drawingReport, `${name}: printable SVG/PDF report parity`);
  const review = svg.drawingReport?.review; assert.ok(review); assert.equal(review.status, expectedStatus);
  if (requiredStatus) assert.equal(review.requirements.find(r => r.requirementId === 'pitch-x')?.status, requiredStatus);
  if (name === 'plate-complete') {
    assert.equal(review.criticalCount, 4); assert.equal(review.coveredCriticalCount, 4);
    assert.equal(review.requirements.find(r => r.requirementId === 'stock-width')?.status, 'missing');
  }
  if (name.startsWith('bearing-')) {
    assert.equal(review.coveredCriticalCount, 2); assert.equal(review.unresolvedDecisionCount, name === 'bearing-pending' ? 1 : 0);
  }
  const expectedLabels: Record<string, string> = name.startsWith('bearing-')
    ? { 'authored:seat-diameter': '44', 'authored:throat-diameter': '32' }
    : { 'authored:pitch-y': '46', 'authored:mounting-diameter': '9', 'authored:bore-diameter': '30', ...(name === 'plate-missing' ? {} : { 'authored:pitch-x': '76' }) };
  for (const [id, value] of Object.entries(expectedLabels)) {
    const row = svg.drawingReport?.annotations.find(a => a.id === id); assert.ok(row, `${id} missing`);
    assert.match(row.text, new RegExp(`(?:^|[^0-9])${value}(?:[^0-9]|$)`), `${id}: wrong computed dimension`);
  }
  const strict = [];
  for (const format of ['svg-drawing', 'pdf-drawing'] as const) {
    const opts = { ...(format === 'svg-drawing' ? options.svg : options.pdf), requireCompleteReview: true };
    let result: ExportResult | undefined; let refusal: unknown;
    try { result = await runAndExport({ ...input, format, options: opts as ExportOptions }); } catch (error) { refusal = error; }
    if (expectedStatus === 'complete') {
      assert.ok(result); exported(result, `${name} strict ${format}`);
      if (format === 'pdf-drawing') { assert.equal(Buffer.from(result.bytes).subarray(0,5).toString(), '%PDF-'); await writeFile(resolve(out, `${name}.strict.pdf`), result.bytes); }
      strict.push({ format, bytes: result.bytes.length, sha256: sha(result.bytes), status: 'emitted' });
    } else {
      assert.ok(refusal); assert.equal((refusal as { code?: string }).code, 'feature.invalid-args'); assert.equal(result, undefined);
      strict.push({ format, bytes: 0, status: 'refused', code: (refusal as { code: string }).code, message: String(refusal) });
    }
  }
  if (expectedStatus === 'incomplete') assert.ok(svg.diagnostics.some(d => d.code === 'drawing.review.incomplete'));
  await writeFile(resolve(out, `${name}.svg`), svg.bytes); await writeFile(resolve(out, `${name}.pdf`), pdf.bytes);
  await sharp(svg.bytes, { density: 144 }).resize({ width: 1680 }).png().toFile(resolve(out, `${name}.png`));
  await writeFile(resolve(out, `${name}.report.json`), json({ svg: svg.drawingReport, pdf: pdf.drawingReport, diagnostics: { svg: svg.diagnostics, pdf: pdf.diagnostics }, strict }));
  console.log(`${name}: ${review.status}, ${review.coveredCriticalCount}/${review.criticalCount} critical, ${review.unresolvedDecisionCount} unresolved; SVG/PDF parity; strict checked`);
}
async function main(): Promise<void> {
  await initOcct();
  const bundleRoot = resolve(process.env.OUTPUT_ROOT ?? resolve(ROOT, 'site/blog'));
  const plateOut = resolve(bundleRoot, 'functional-drafting'); const bearingOut = resolve(bundleRoot, 'drawing-decisions');
  await mkdir(plateOut, { recursive: true }); await mkdir(bearingOut, { recursive: true });
  const cases = ['plate-complete', 'plate-missing', 'plate-hidden', 'bearing-pending', 'bearing-resolved'];
  if (process.argv[2] === '--case') {
    const name = process.argv[3]; assert.ok(cases.includes(name));
    if (name.startsWith('plate-')) {
      const source = name === 'plate-missing' ? 'fixture-plate-missing.kcad.ts' : 'fixture-plate.kcad.ts';
      await geometry(resolve(HERE, source), resolve(plateOut, source.replace('.kcad.ts', '.geometry.json')));
      const overrides = name === 'plate-missing' ? Object.fromEntries(Object.entries(placement).filter(([id]) => id !== 'authored:pitch-x'))
        : name === 'plate-hidden' ? { ...placement, 'authored:pitch-x': { ...placement['authored:pitch-x'], suppress: true } } : placement;
      await makeCase(plateOut, name, source, { annotationOverrides: overrides }, name === 'plate-complete' ? 'complete' : 'incomplete', name === 'plate-missing' ? 'missing' : name === 'plate-hidden' ? 'hidden' : undefined);
    } else {
      await geometry(resolve(HERE, 'bearing-seat.kcad.ts'), resolve(bearingOut, 'bearing-seat.geometry.json'));
      await makeCase(bearingOut, name, 'bearing-seat.kcad.ts', { annotationOverrides: { 'authored:throat-diameter': { offset: 20 } },
        ...(name === 'bearing-resolved' ? { decisionResolutions: { [drawingDecisionKey('bearing-mount', 'insert-retention')]: resolution } } : {}) }, name === 'bearing-pending' ? 'incomplete' : 'complete');
    }
    return;
  }
  // OCCT WASM state is process-local: each named case gets a fresh kernel.
  for (const name of cases) {
    const child = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), '--case', name], { cwd: ROOT, stdio: 'inherit' });
    assert.equal(child.status, 0, `${name} generation failed`);
  }
  const completeGeom = JSON.parse(await readFile(resolve(plateOut, 'fixture-plate.geometry.json'), 'utf8'));
  const missingGeom = JSON.parse(await readFile(resolve(plateOut, 'fixture-plate-missing.geometry.json'), 'utf8'));
  assert.deepEqual(completeGeom.boundingBox, missingGeom.boundingBox); near(completeGeom.volumeMm3, missingGeom.volumeMm3);
  for (const out of [plateOut, bearingOut]) {
    const files = (await readdir(out)).filter(f => /\.(?:json|svg|pdf|png|ts)$/.test(f) && f !== 'manifest.json').sort();
    const entries = await Promise.all(files.map(async path => { const bytes = await readFile(resolve(out, path)); return { path, bytes: bytes.length, sha256: sha(bytes) }; }));
    await writeFile(resolve(out, 'manifest.json'), json({ command: 'npx tsx examples/functional-drafting/run.ts', date, revision: 'EXAMPLE', sourceCheckoutRequired: true, files: entries,
      limits: ['Declared review completeness only; omitted scope remains omitted.', 'Decision notes record intent/provenance without changing geometry or certifying numerical fit, tolerance or GD&T.', 'No physical manufacture or load acceptance.'] }));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
