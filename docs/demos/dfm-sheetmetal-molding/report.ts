// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Runs dfm_review on the four demo parts and writes result.json (the check
// rows plus the located findings the demo frames quote).
// Usage: npx tsx docs/demos/dfm-sheetmetal-molding/report.ts
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { dfmReviewTool } from '../../../src/agent/mcp/tools/dfmReview';
import { resolveTopoRefTool } from '../../../src/agent/mcp/tools/resolveTopoRef';

const here = dirname(fileURLToPath(import.meta.url));
await initOcct();
const runs = [
  ['tray-undrafted', 'tray-undrafted', 'injection-molding'],
  ['tray-drafted', 'tray-drafted', 'injection-molding'],
  ['bracket-tight', 'bracket-tight', 'sheet-metal'],
  ['bracket-fixed', 'bracket-fixed', 'sheet-metal'],
  ['tray-not-sheet-metal', 'tray-undrafted', 'sheet-metal'],
  ['tray-fdm', 'tray-undrafted', 'fdm'],
] as const;
const out: Record<string, unknown> = {};
for (const [name, fixture, process] of runs) {
  const call = { file: join(here, `${fixture}.kcad.ts`), processes: [process] };
  const r = await dfmReviewTool(call);
  const refs = new Set([
    ...r.checks.flatMap(c => c.refs ?? []),
    ...(r.fdm ?? []).flatMap(({ result }) => result.orientation.overhangs.flatMap(region =>
      region.faceRef === undefined ? [] : [region.faceRef])),
    ...(r.injectionMolding ?? []).flatMap(({ result }) => [
      ...result.draft.insufficient.flatMap(face => face.faceRef === undefined ? [] : [face.faceRef]),
      ...result.undercut.faces.flatMap(face => face.faceRef === undefined ? [] : [face.faceRef]),
      ...result.sharpCorners.flatMap(corner => corner.faceRefs ?? []),
    ]),
  ]);
  const resolvedRefs: Array<{ ref: string; resolvesAs: string }> = [];
  for (const ref of refs) {
    const resolved = await resolveTopoRefTool({ file: call.file, ref });
    if (!resolved.ok || resolved.entity?.kind !== 'face') {
      throw new Error(`Topology reference ${ref} did not resolve against ${fixture}: ${resolved.error ?? 'not a face'}`);
    }
    resolvedRefs.push({ ref, resolvesAs: resolved.ref });
  }
  out[name] = {
    call: { file: `${fixture}.kcad.ts`, processes: [process] },
    ok: r.ok,
    verdict: r.verdict,
    checks: r.checks.map(c => ({
      id: c.id, process: c.process, source: c.source, status: c.status, summary: c.summary,
      ...(c.value !== undefined ? { value: c.value } : {}),
      ...(c.limit !== undefined ? { limit: c.limit } : {}),
      ...(c.unit !== undefined ? { unit: c.unit } : {}),
      ...(c.op !== undefined ? { op: c.op } : {}),
      ...(c.tolerance !== undefined ? { tolerance: c.tolerance } : {}),
      ...(c.refs !== undefined ? { refs: c.refs } : {}),
    })),
    topologyRefVerification: {
      fixture: `${fixture}.kcad.ts`,
      status: refs.size === 0 ? 'no-refs-emitted' : 'all-resolved',
      emitted: [...refs],
      resolved: resolvedRefs,
    },
    ...(r.injectionMolding ? {
      undraftedFaces: r.injectionMolding[0].result.draft.insufficient.flatMap(f => f.faceRef === undefined ? [] : [f.faceRef]),
      undercutFaces: r.injectionMolding[0].result.undercut.faces.map(f => ({
        ...(f.faceRef !== undefined ? { face: f.faceRef } : {}),
        location: f.location,
      })),
    } : {}),
    ...(r.sheetMetal ? {
      holeToBend: r.sheetMetal[0].result.holeToBend,
      bends: r.sheetMetal[0].result.bends,
    } : {}),
  };
  console.log(name, `ok=${r.ok}`, `verdict=${r.verdict ?? 'omitted'}`, r.checks.map(c => `${c.id}=${c.status}`).join(' '));
}
writeFileSync(join(here, 'result.json'), JSON.stringify(out, null, 2) + '\n');
process.exit(0);
