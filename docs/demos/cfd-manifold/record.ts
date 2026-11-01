// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// run_cfd demo: the coolant splitter manifold end to end, plus the two
// analytic validation cases. Needs a local OpenFOAM (native or the
// opencfd/openfoam-run image). Writes, next to this file:
//   result.json          the manifold summary (trimmed) and the invocation
//   transcript.txt       `kernelcad cfd run` formatted output
//   validation.json      Hagen-Poiseuille and sphere-drag numbers vs analytic
//   velocity-midplane.png  the tool's own preview PNG
//   fluid-volume.stl     the extracted fluid volume in mm (input of
//                        fluid-volume.kcad.ts, for the render; gitignored)
//
//   npx tsx docs/demos/cfd-manifold/record.ts [workDir]

import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCfdTool } from '../../../src/agent/mcp/tools/runCfd';
import { formatCfdResult } from '../../../src/agent/cli/commands/cfd';

const dir = dirname(fileURLToPath(import.meta.url));
const work = resolve(process.argv[2] ?? '/tmp/kernelcad-cfd-demo');

const manifold = await runCfdTool({ file: join(dir, 'manifold.kcad.ts'), output_dir: join(work, 'manifold') });
if (manifold.summary === undefined) throw new Error(manifold.error ?? 'run_cfd failed');
const s = manifold.summary;
await writeFile(join(dir, 'transcript.txt'), `$ kernelcad cfd run docs/demos/cfd-manifold/manifold.kcad.ts\n${formatCfdResult({ ...manifold, out_dir: '<work>/manifold', images: ['<work>/manifold/velocity-midplane.png'] })}\n`);
await copyFile(manifold.images![0], join(dir, 'velocity-midplane.png'));
const outlets = s.patches.filter(p => p.patch.startsWith('outlet'));
const total = outlets.reduce((a, p) => a + p.flowM3s, 0);
await writeFile(join(dir, 'result.json'), `${JSON.stringify({
  invocation: { tool: 'run_cfd', arguments: { file: 'docs/demos/cfd-manifold/manifold.kcad.ts' }, study: 'declared shape.cfdStudy({ name: "splitter-0.3lpm", ... })' },
  ok: manifold.ok,
  openfoam: s.openfoam,
  reynolds: s.reynolds,
  turbulence: s.turbulence,
  mesh: { cells: s.mesh.cells, ok: s.mesh.ok, maxNonOrthogonality: s.mesh.maxNonOrthogonality, maxSkewness: s.mesh.maxSkewness, patchFaces: s.mesh.patchFaces, surfaceCellMm: s.mesh.surfaceCellMm },
  convergence: { verdict: s.convergence.verdict, criterion: s.convergence.criterion, reason: s.convergence.reason, monitor: s.convergence.monitor },
  pressureDropPa: s.pressureDropPa,
  outlets: outlets.map(p => ({ patch: p.patch, lpm: p.flowM3s * 60_000, share: p.flowM3s / total })),
  massBalance: s.massBalance,
  maxVelocity: s.maxVelocity,
  meshMs: s.meshMs,
  solveMs: s.solveMs,
  disclaimer: s.disclaimer,
}, null, 2)}\n`);

// Fluid volume STL (case STL is in metres) -> mm for the render script.
const stl = await readFile(join(work, 'manifold', 'case', 'constant', 'triSurface', 'geometry.stl'), 'utf8');
const mm = stl.replace(/vertex (\S+) (\S+) (\S+)/g, (_m, x: string, y: string, z: string) => `vertex ${Number(x) * 1000} ${Number(y) * 1000} ${Number(z) * 1000}`)
  .replace(/^(end)?solid \w+$/gm, (line: string) => (line.startsWith('end') ? 'endsolid fluid' : 'solid fluid'));
// One solid: merge the per-patch blocks so the importer sees one shell.
const merged = `solid fluid\n${mm.replace(/^(end)?solid fluid\n/gm, '')}endsolid fluid\n`;
await writeFile(join(dir, 'fluid-volume.stl'), merged);

// Validation against analytic results.
const pipe = await runCfdTool({
  code: 'return cylinder(200, 7).rotate([0, 1, 0], 90).subtract(cylinder(200, 5).rotate([0, 1, 0], 90));',
  flow: 'internal', fluid: 'water', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002, iterations: 600, output_dir: join(work, 'poiseuille'),
});
const nu = 1.511e-5;
const sphere = await runCfdTool({ code: 'return sphere(5);', flow: 'external', fluid: 'air', velocity: (50 * nu) / 0.01, iterations: 600, output_dir: join(work, 'sphere') });
const ps = pipe.summary!;
const Q = -ps.patches.find(p => p.patch === 'inlet')!.flowM3s;
const mu = 998.2 * 1.004e-6;
const hp = (128 * mu * 0.2 * Q) / (Math.PI * 0.01 ** 4);
const ss = sphere.summary!;
const re = ss.reynolds.value;
const sn = (24 / re) * (1 + 0.15 * re ** 0.687);
const validation = {
  poiseuille: {
    case: 'water pipe D 10 mm, L 200 mm, mean 2 mm/s (Re 20), laminar, plug inlet',
    ok: pipe.ok, verdict: ps.convergence.verdict, cells: ps.mesh.cells,
    pressureDropPa: ps.pressureDropPa, analyticPa: hp, error: ps.pressureDropPa! / hp - 1,
    centrelineOverMean: ps.maxVelocity / 0.002, analyticCentrelineOverMean: 2,
    note: 'includes the inlet development length (about 2-3% extra at Re 20)',
    solveMs: ps.solveMs, meshMs: ps.meshMs,
  },
  sphere: {
    case: 'sphere D 10 mm in air at Re 50, laminar steady',
    ok: sphere.ok, verdict: ss.convergence.verdict, cells: ss.mesh.cells,
    cd: ss.forces!.cd, schillerNaumannCd: sn, error: ss.forces!.cd / sn - 1, cl: ss.forces!.cl,
    solveMs: ss.solveMs, meshMs: ss.meshMs,
  },
};
await writeFile(join(dir, 'validation.json'), `${JSON.stringify(validation, null, 2)}\n`);
console.log(JSON.stringify({ manifold: { dp: s.pressureDropPa, outlets: outlets.map(o => o.flowM3s * 60_000), verdict: s.convergence.verdict }, validation }, null, 2));
