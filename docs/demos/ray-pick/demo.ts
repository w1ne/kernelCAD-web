// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rayPickTool } from '../../../src/agent/mcp/tools/rayPick';

const dir = dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, selection: null, revision: 0, modelGeneration: 7 }));
const result = await rayPickTool({ studio_url: 'http://localhost:5173', session: 'demo-session-token', code: 'return box(10, 10, 10);', origin: [-5, 5, 5], direction: [1, 0, 0] }) as {
  ok: boolean; feature_id?: string; hit_basis?: string;
  model_generation?: number;
  hits?: Array<{ face_id: number; distance: number; point: number[]; normal: number[] }>;
  error?: string;
};
if (!result.ok || !result.hits) throw new Error(result.error ?? 'ray_pick produced no hit list');

const rows = result.hits.map((hit, index) => {
  const y = 500 + index * 34;
  const x = 330 + (hit.distance / 15) * 570;
  return `<circle cx="${x}" cy="360" r="9" fill="#36d399"/><text x="80" y="${y}" class="row">face ${hit.face_id} · ${hit.distance.toFixed(2)} mm · point (${hit.point.map(n => n.toFixed(1)).join(', ')}) · normal (${hit.normal.map(n => n.toFixed(2)).join(', ')})</text>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#101820"/><text x="80" y="90" class="title">kernelCAD · ray_pick</text>
<text x="80" y="135" class="sub">Local model evaluation · 10 mm box · ray from [-5, 5, 5] along +X</text>
<path d="M330 250h470v220H330z M400 190h470v220H400z M330 250l70-60m470 60 70-60M800 470l70-60M330 470l70-60" fill="#1d3442" stroke="#90b4c5" stroke-width="3"/>
<path d="M180 360H1010" stroke="#ffc857" stroke-width="4" marker-end="url(#arrow)"/><text x="90" y="335" class="sub">ray</text>${rows}
<text x="80" y="580" class="foot">Studio session state is a local fixture (model generation ${result.model_generation}).</text>
<text x="80" y="610" class="foot">Local ray validation uses viewer per-face tessellation; curved-face values are mesh approximations.</text>
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#ffc857"/></marker></defs>
<style>.title{font:700 38px sans-serif;fill:#f3f6f8}.sub{font:20px sans-serif;fill:#bdcbd2}.row{font:17px monospace;fill:#e7f1f5}.foot{font:15px sans-serif;fill:#91a4ae}</style></svg>`;
await mkdir(dir, { recursive: true });
await writeFile(resolve(dir, 'demo.svg'), svg);
await writeFile(resolve(dir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote local ray_pick demonstration with ${result.hits.length} face hits.`);
