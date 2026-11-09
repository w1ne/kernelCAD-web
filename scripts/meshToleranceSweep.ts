// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Manual real-part sweep for the STL mesh tolerance export path.
 *  Run with: node --import tsx scripts/meshToleranceSweep.ts
 *  This intentionally stays outside the unit-test suite because the
 *  planetary assembly emits roughly two million STL triangles.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadSnippets } from '../src/agent/cookbook';
import { runAndExport, runAndExportParts } from '../src/agent/script-runtime/export';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';

const TOLERANCE_MM = 0.01;
const SAMPLE_IDS = [
  'shaft-and-bearing-cylindrical-mate',
  'fdm-fit-clearance-by-fit-type',
  'heat-set-insert-pilot',
  'nema-motor-mounting-plate',
  'planetary-stage-internal-ring',
] as const;

interface PartResult {
  name: string;
  default_triangles: number;
  tolerance_triangles: number;
  triangle_increase: number;
  measured_max_mm: number;
  measured_p95_mm: number;
  samples: number;
  measurement: 'sampled_brep_surface_to_export_triangles';
  global_max_certified: false;
  watertight: boolean;
}

interface ModePart {
  name: string;
  triangle_count: number;
  measured_max_mm?: number;
  measured_p95_mm?: number;
  samples?: number;
  measurement?: 'sampled_brep_surface_to_export_triangles';
  global_max_certified?: false;
  watertight: boolean;
}

interface ModeResult {
  id: string;
  parts: ModePart[];
  diagnostics: string[];
  fit?: unknown;
}

async function main(): Promise<void> {
  if (process.argv[2] === '--one') {
    process.stdout.write(`${JSON.stringify(await runOne(process.argv[3] ?? '', process.argv[4] as 'default' | 'tolerance'))}\n`);
    return;
  }

  // Run default and requested exports in separate processes so OCCT/WASM
  // allocations from the large planetary mesh are released between exports.
  const results = SAMPLE_IDS.map(id => {
    process.stderr.write(`Sweeping ${id}…\n`);
    const defaults = runMode(id, 'default');
    const tolerance = runMode(id, 'tolerance');
    const defaultByName = new Map(defaults.parts.map(part => [part.name, part.triangle_count]));
    const parts = tolerance.parts.map(part => {
      const baseline = defaultByName.get(part.name);
      if (baseline === undefined) throw new Error(`${id}/${part.name}: default export has no matching part.`);
      if (part.measured_max_mm === undefined || part.measured_p95_mm === undefined || part.samples === undefined ||
          part.measurement === undefined || part.global_max_certified !== false) {
        throw new Error(`${id}/${part.name}: tolerance export did not return a complete mesh_deviation report.`);
      }
      return {
        name: part.name,
        default_triangles: baseline,
        tolerance_triangles: part.triangle_count,
        triangle_increase: part.triangle_count - baseline,
        measured_max_mm: part.measured_max_mm,
        measured_p95_mm: part.measured_p95_mm,
        samples: part.samples,
        measurement: part.measurement,
        global_max_certified: false,
        watertight: defaults.parts.find(candidate => candidate.name === part.name)?.watertight === true && part.watertight,
      };
    });
    return {
      id,
      parts,
      diagnostics: [...new Set([...defaults.diagnostics, ...tolerance.diagnostics])],
      ...(tolerance.fit === undefined ? {} : { fit: tolerance.fit }),
    };
  });
  const sampledFailure = results.some(result =>
    result.diagnostics.length > 0 ||
    result.parts.some(part => !part.watertight || part.measured_max_mm > TOLERANCE_MM),
  );
  process.stdout.write(`${JSON.stringify({
    tolerance_mm: TOLERANCE_MM,
    measurement: 'sampled_brep_surface_to_export_triangles',
    global_max_certified: false,
    results,
    sampled_threshold_passed: !sampledFailure,
  }, null, 2)}\n`);
  if (sampledFailure) process.exitCode = 1;
}

function runMode(id: string, mode: 'default' | 'tolerance'): ModeResult {
  const child = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), '--one', id, mode], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (child.error) throw child.error;
  if (child.status !== 0) {
    throw new Error(`${id} ${mode} export failed with exit ${String(child.status)}:\n${child.stderr}\n${child.stdout.slice(-4000)}`);
  }
  return JSON.parse(child.stdout) as ModeResult;
}

async function runOne(id: string, mode: 'default' | 'tolerance'): Promise<ModeResult> {
  if (!(SAMPLE_IDS as readonly string[]).includes(id)) throw new Error(`Unknown cookbook sample: ${id}`);
  if (mode !== 'default' && mode !== 'tolerance') throw new Error('Expected --one <cookbook-id> <default|tolerance>.');
  await initOcct();
  const snippets = loadSnippets();
  const snippet = snippets.find(item => item.id === id);
  if (!snippet) throw new Error(`Missing cookbook snippet: ${id}`);

  if (id === 'heat-set-insert-pilot') {
    const result = await runAndExport({
      code: snippet.body,
      fileName: `${id}.kcad.ts`,
      format: 'stl',
      ...(mode === 'tolerance' ? { options: { format: 'stl' as const, tolerance: TOLERANCE_MM } } : {}),
    });
    const report = result.mesh_deviation;
    if (mode === 'tolerance' && !report) throw new Error(`${id}: tolerance export did not return mesh_deviation.`);
    const errors = result.diagnostics.filter(diagnostic => diagnostic.severity === 'error').map(d => d.code);
    return {
      id,
      parts: [{
        name: 'body',
        triangle_count: report?.triangles ?? stlTriangleCount(result.bytes),
        ...(report === undefined ? {} : {
          measured_max_mm: report.measured_max_mm,
          measured_p95_mm: report.measured_p95_mm,
          samples: report.samples,
          measurement: report.measurement,
          global_max_certified: false,
        }),
        watertight: !errors.includes('export.mesh.not-watertight'),
      }],
      diagnostics: errors,
    };
  }

  const result = await runAndExportParts({
    code: snippet.body,
    fileName: `${id}.kcad.ts`,
    ...(mode === 'tolerance' ? { options: { tolerance: TOLERANCE_MM } } : {}),
  });
  const diagnostics = result.diagnostics.filter(diagnostic => diagnostic.severity === 'error').map(diagnostic => diagnostic.code);
  const parts = result.parts.map(part => {
    const report = part.mesh_deviation;
    if (mode === 'tolerance' && !report) throw new Error(`${id}/${part.name}: tolerance export did not return mesh_deviation.`);
    return {
      name: part.name,
      triangle_count: part.triangleCount,
      ...(report === undefined ? {} : {
        measured_max_mm: report.measured_max_mm,
        measured_p95_mm: report.measured_p95_mm,
        samples: report.samples,
        measurement: report.measurement,
        global_max_certified: false,
      }),
      watertight: part.report.ok,
    };
  });

  const modeResult: ModeResult = { id, parts, diagnostics };
  if (mode === 'tolerance' && id === 'fdm-fit-clearance-by-fit-type') {
    const bracket = result.parts.find(part => part.name === 'bracket');
    if (!bracket) throw new Error('FDM fit assembly did not produce the bracket STL.');
    modeResult.fit = {
      hole: 'bracket bore',
      nominal_diameter_mm: 8.6,
      fitted_diameter_mm: fitCircleDiameterFromStl(bracket.bytes),
      method: 'least-squares circle fit over exported Float32 STL vertices on the bore-radius band',
    };
  }
  return modeResult;
}

function stlTriangleCount(bytes: Uint8Array): number {
  if (bytes.byteLength < 84) throw new Error('STL is too short to contain a binary triangle count.');
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
}

function fitCircleDiameterFromStl(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  const points: Array<[number, number]> = [];
  let offset = 84;
  for (let triangle = 0; triangle < count; triangle++) {
    offset += 12;
    for (let vertex = 0; vertex < 3; vertex++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      const radius = Math.hypot(x, y);
      if (z >= -0.01 && z <= 12.01 && radius >= 4.0 && radius <= 4.6) points.push([x, y]);
      offset += 12;
    }
    offset += 2;
  }
  if (points.length < 3) throw new Error(`Only ${points.length} STL vertices found on the expected bore-radius band.`);

  let xx = 0, xy = 0, x = 0, yy = 0, y = 0, n = 0;
  let rhsX = 0, rhsY = 0, rhsOne = 0;
  for (const [px, py] of points) {
    const q = -(px * px + py * py);
    xx += px * px; xy += px * py; x += px;
    yy += py * py; y += py; n += 1;
    rhsX += px * q; rhsY += py * q; rhsOne += q;
  }
  const [a, b, c] = solve3x3([[xx, xy, x], [xy, yy, y], [x, y, n]], [rhsX, rhsY, rhsOne]);
  const cx = -a / 2;
  const cy = -b / 2;
  const radiusSquared = cx * cx + cy * cy - c;
  if (!(radiusSquared > 0)) throw new Error('STL bore-circle fit produced a non-positive radius.');
  return 2 * Math.sqrt(radiusSquared);
}

function solve3x3(matrix: number[][], rhs: number[]): [number, number, number] {
  const rows = matrix.map((row, index) => [...row, rhs[index]!]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(rows[row]![col]!) > Math.abs(rows[pivot]![col]!)) pivot = row;
    }
    if (Math.abs(rows[pivot]![col]!) < 1e-12) throw new Error('STL bore-circle fit is singular.');
    [rows[col], rows[pivot]] = [rows[pivot]!, rows[col]!];
    const divisor = rows[col]![col]!;
    for (let j = col; j < 4; j++) rows[col]![j] = rows[col]![j]! / divisor;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const factor = rows[row]![col]!;
      for (let j = col; j < 4; j++) rows[row]![j] = rows[row]![j]! - factor * rows[col]![j]!;
    }
  }
  return [rows[0]![3]!, rows[1]![3]!, rows[2]![3]!];
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
