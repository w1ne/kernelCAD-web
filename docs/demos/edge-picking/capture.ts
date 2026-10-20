// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { SharedSelectionItem } from '../../../src/shared/selection/sharedSelection';

const script = 'examples/edge-picking.kcad.ts';
const studioUrl = process.env.KCAD_STUDIO_URL ?? 'http://127.0.0.1:5180';
const code = 'const body = box(10, 10, 10);\nreturn body;';
const base = new URL(studioUrl);
const sessionUrl = new URL('/__kernelcad/session', base);
sessionUrl.searchParams.set('script', script);
const sessionResponse = await fetch(sessionUrl);
if (!sessionResponse.ok) throw new Error(`Studio session request failed (${sessionResponse.status}).`);
const { sessionToken } = await sessionResponse.json() as { sessionToken: string };

const selected = await callMcpTool('get_selection', { studio_url: base.origin, session: sessionToken }) as {
  ok: boolean;
  modelGeneration: number;
  selection: SharedSelectionItem | null;
  selections?: SharedSelectionItem[];
};
const edgeSelections = (selected.selections ?? (selected.selection ? [selected.selection] : []))
  .filter((item) => item.kind === 'edge');
const refs = edgeSelections.map((item) => item.ref).filter((ref): ref is string => typeof ref === 'string');
if (!selected.ok || refs.length === 0 || refs.length !== edgeSelections.length) {
  throw new Error('Pick one or more BREP edges in Studio first; each edge must have a stable operation ref.');
}

const meshUrl = new URL('/__kernelcad/mesh', base);
meshUrl.searchParams.set('session', sessionToken);
const meshResponse = await fetch(meshUrl);
if (!meshResponse.ok) throw new Error(`Studio mesh request failed (${meshResponse.status}).`);
const mesh = await meshResponse.json() as { features?: Array<{ volume?: number }> };
const beforeVolume = mesh.features?.at(-1)?.volume;

const blend = await callMcpTool('apply_surface_blend', {
  code,
  shape_binding: 'body',
  radius: 1,
  selector: refs,
}) as {
  ok: boolean;
  new_code?: string;
  sceneSummary?: { valid?: boolean | null; volume?: number | null };
  diagnostics?: unknown[];
  viewerUrl?: string;
};
const afterVolume = blend.sceneSummary?.volume;
if (!blend.ok || !blend.new_code || blend.sceneSummary?.valid !== true
  || typeof beforeVolume !== 'number' || typeof afterVolume !== 'number' || afterVolume >= beforeVolume) {
  throw new Error(`MCP fillet did not produce a valid lower-volume solid: ${JSON.stringify({ ok: blend.ok, sceneSummary: blend.sceneSummary, diagnostics: blend.diagnostics })}`);
}

const output = fileURLToPath(new URL('./result.kcad.ts', import.meta.url));
const evidence = fileURLToPath(new URL('./verification.json', import.meta.url));
writeFileSync(output, `${blend.new_code.trimEnd()}\n`);
writeFileSync(evidence, `${JSON.stringify({
  environment: 'local Studio + MCP, 2026-10-20',
  model: script,
  operation: 'fillet',
  radius: 1,
  selectedEdges: edgeSelections.map(({ stableId, ref }) => ({ stableId, ref })),
  modelGeneration: selected.modelGeneration,
  valid: blend.sceneSummary.valid,
  beforeVolume,
  afterVolume,
  volumeDelta: beforeVolume - afterVolume,
  returnedSource: 'result.kcad.ts',
  viewerProvisioned: typeof blend.viewerUrl === 'string',
}, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  ok: blend.ok,
  selectedEdges: edgeSelections.map(({ stableId, ref }) => ({ stableId, ref })),
  beforeVolume,
  afterVolume,
  volumeDelta: beforeVolume - afterVolume,
  valid: blend.sceneSummary.valid,
  resultSource: 'docs/demos/edge-picking/result.kcad.ts',
})}\n`);
