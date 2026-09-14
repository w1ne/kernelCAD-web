// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Compare a plain G1 fillet vs a G2 blend:
//   inspect({ of: 'continuity' }) numbers first, then zebra render_preview.
//
//   npx tsx examples/surface-quality/run.ts
//
// MEASURED OUTPUT
//
//   plain fillet (G1): shared 48  G2 0  G1 48  G0 0  broken 0
//     worst @kc[fillet_1/edge/e4] G1  G1 0.00°  G2 Δ 1.00e+0
//   G2 blend: shared 1  G2 1  G1 0  G0 0  broken 0
//     worst @kc[surfaceSew_1/edge/e3] G2  G1 0.00°  G2 Δ 0.00e+0
//   zebra overlay: ok=true .../examples/surface-quality/out/zebra/iso.png
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callMcpTool } from '../../src/agent/mcp/toolRegistry';
import type { InspectContinuityOutput } from '../../src/agent/mcp/tools/inspectContinuity';
import type { RenderPreviewOutput } from '../../src/agent/mcp/tools/renderPreview';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out');

function summarise(label: string, r: InspectContinuityOutput): void {
  if (!r.ok) {
    console.log(`${label}: FAIL ${r.error}`);
    return;
  }
  const s = r.summary!;
  console.log(`${label}: shared ${s.shared}  G2 ${s.g2}  G1 ${s.g1}  G0 ${s.g0}  broken ${s.broken}`);
  const worst = [...r.edges!].sort((a, b) => b.maxNormalAngleDeg - a.maxNormalAngleDeg)[0];
  if (worst) {
    console.log(
      `  worst ${worst.ref} ${worst.class}  G1 ${worst.maxNormalAngleDeg.toFixed(2)}°  ` +
        `G2 Δ ${worst.maxCurvatureDiff.toExponential(2)}  ` +
        `at [${worst.worstSample.point.map(n => n.toFixed(2)).join(', ')}]`,
    );
  }
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const plainFile = join(here, 'plain-fillet.kcad.ts');
  const g2File = join(here, 'g2-blend.kcad.ts');

  const plain = (await callMcpTool('inspect', { of: 'continuity', file: plainFile })) as InspectContinuityOutput;
  const g2 = (await callMcpTool('inspect', { of: 'continuity', file: g2File })) as InspectContinuityOutput;
  summarise('plain fillet (G1)', plain);
  summarise('G2 blend', g2);

  const zebra = (await callMcpTool('render_preview', {
    file: g2File,
    overlay: 'zebra',
    views: ['iso'],
    width: 512,
    height: 512,
    out_dir: join(outDir, 'zebra'),
    no_mechanism_check: true,
  })) as RenderPreviewOutput;
  console.log(`zebra overlay: ok=${zebra.ok} ${zebra.images?.map(i => i.path).join(' ') ?? zebra.error}`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
