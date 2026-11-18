// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// diff_geometry face-level change lists on a motor-mount plate: revision B
// opens the two mounting holes and adds a pilot bore. Records the returned
// per-body face lists and summary text, and asks for the overlay render.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { diffGeometryTool } from '../../../src/agent/mcp/tools/diffGeometry';

const dir = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(dir, 'overlay');
await mkdir(outDir, { recursive: true });
await initOcct();

const args = {
  baseFile: resolve(dir, 'before.kcad.ts'),
  file: resolve(dir, 'after.kcad.ts'),
  render: process.argv.includes('--render'),
  out_dir: outDir,
};
const result = await diffGeometryTool(args);
if (!result.ok) throw new Error(result.error);

const body = result.bodies[0];
const record = {
  invocation: {
    tool: 'diff_geometry',
    arguments: { baseFile: 'before.kcad.ts', file: 'after.kcad.ts', render: args.render },
  },
  verdict: body.verdict,
  volumeMm3: body.volumeMm3,
  addedMm3: body.addedMm3,
  removedMm3: body.removedMm3,
  faceCount: body.faceCount,
  holeCount: body.holeCount,
  faces: body.faces,
  summary: result.summary,
  // Paths relative to this directory so the record is machine-independent.
  render: result.render === undefined ? undefined : {
    ...result.render,
    out_dir: result.render.out_dir !== undefined ? relative(dir, result.render.out_dir) : undefined,
    script_path: result.render.script_path !== undefined ? relative(dir, result.render.script_path) : undefined,
    images: result.render.images?.map((p) => relative(dir, p)),
  },
};
await writeFile(resolve(dir, 'result.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(result.summary.text);
