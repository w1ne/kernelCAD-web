// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// set_param feature mode on a bolt-hole bracket: shrink the M8 clearance hole
// (r = 4) to an M6 clearance hole (r = 3.3) by feature id, then record the
// rewritten source and the before/after diff the tool returned.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { setParamValueTool } from '../../../src/agent/mcp/tools/setParamValue';

const dir = dirname(fileURLToPath(import.meta.url));
await initOcct();
const code = await readFile(resolve(dir, 'before.kcad.ts'), 'utf8');
const result = await setParamValueTool({ code, feature: 'cylinder_1', changes: { r: 3.3 } });
if (!result.ok || result.new_code === undefined) throw new Error(result.error ?? 'feature edit failed');
await writeFile(resolve(dir, 'after.kcad.ts'), result.new_code);
const summary = {
  invocation: { tool: 'set_param', arguments: { feature: 'cylinder_1', changes: { r: 3.3 } } },
  ok: result.ok,
  feature: result.feature,
  kind: result.kind,
  edits: result.edits,
  changedParams: result.changedParams,
  geometry: result.geometry?.summary,
  before: { buildOk: result.before?.buildOk, featureCount: result.before?.featureCount, requirementsOk: result.before?.requirementsOk },
  after: { buildOk: result.after?.buildOk, featureCount: result.after?.featureCount, requirementsOk: result.after?.requirementsOk },
};
await writeFile(resolve(dir, 'result.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
