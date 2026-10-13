// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { EvaluateScriptOutput } from '../../../src/agent/mcp/tools/evaluateScript';

const outDir = fileURLToPath(new URL('.', import.meta.url));
const calls = [
  { title: 'Build a body', code: 'return box(40,30,10);' },
  { title: 'Cut a through bore', code: 'return box(40,30,10).subtract(cylinder(20,5).translate(20,15,0));' },
  { title: 'Capture-only validation', code: 'return box(40,30,10);', dryRun: true },
];
const evidence = [];
const xml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const [i, input] of calls.entries()) {
  const { title, ...args } = input;
  const result = await callMcpTool('evaluate_script', args) as EvaluateScriptOutput;
  if (!result.ok || !result.sceneSummary) throw new Error('Demo build failed');
  evidence.push({ tool: 'evaluate_script', input: args, result });
  const summary = result.sceneSummary;
  const facts = [
    `Tool success: ${result.ok}   |   Features: ${result.featureCount}`,
    `BREP valid: ${summary.valid ?? 'unavailable (not lowered)'}`,
    `Volume: ${summary.volume === null ? 'unavailable' : summary.volume.toFixed(3) + ' mm³'}`,
    `Face count: ${summary.faceCount ?? 'unavailable'}`,
    `Bounding size: ${summary.size === null ? 'unavailable' : summary.size.map(n => n.toFixed(2)).join(' × ') + ' mm'}`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#111827"/>
  <g fill="#f9fafb" font-family="Menlo, monospace">
  <text x="60" y="65" font-size="22" fill="#93c5fd">kernelCAD • MCP scene summary • ${i + 1}/3</text>
  <text x="60" y="135" font-size="36">${xml(title)}</text>
  <text x="60" y="190" font-size="19" fill="#d1d5db">evaluate_script(${input.dryRun ? '{ dryRun: true, code }' : '{ code }'})</text>
  <text x="60" y="235" font-size="18" fill="#a7f3d0">${xml(input.code)}</text>
  ${facts.map((s, n) => `<text x="60" y="${320 + n * 53}" font-size="27">${xml(s)}</text>`).join('')}
  <text x="60" y="640" font-size="19" fill="#93c5fd">Actual local MCP results • presentation from captured JSON</text>
  <text x="60" y="675" font-size="18" fill="#9ca3af">Local validation only • no deployed or hardware acceptance claim</text>
  </g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, `frame-${String(i).padStart(2,'0')}.png`));
}
await writeFile(join(outDir,'calls.json'),JSON.stringify(evidence,null,2)+'\n');
execFileSync('/opt/homebrew/bin/ffmpeg', ['-y','-framerate','1/4','-i',join(outDir,'frame-%02d.png'),'-c:v','libx264','-r','24','-pix_fmt','yuv420p','-movflags','+faststart',join(outDir,'demo.mp4')], {stdio:'pipe'});
await writeFile(join(outDir,'verification.json'),JSON.stringify({ recordedAt:new Date().toISOString(),provenance:'Actual local callMcpTool dispatch; video presentation from retained JSON, no browser capture',calls:3,width:1280,height:720,fps:24,durationSeconds:12,deployVerified:false,hardwareAccepted:false },null,2)+'\n');
