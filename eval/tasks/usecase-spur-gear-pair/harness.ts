// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-spur-gear-pair/harness.ts
//
// U6 spur gear pair: tooth counts and tip circles, centre distance, mesh
// engagement without overlap, keyed bores and exports. Also builds the
// cookbook's gear recipe, the first thing an agent reaches for. See
// eval/tasks/USECASES.md.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { HarnessResult } from '../../types';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import {
  buildUsecase, bbox, emptyIn, evaluateScriptVerdict, fullIn, isClosedSolid, materialIn, near, part,
  standardExports, standardGates,
} from '../../usecaseChecks';

const RECIPE = fileURLToPath(new URL('../../../cookbook/snippets/involute-spur-gear-pair.md', import.meta.url));

/** A small probe box centred at polar (r, deg) around (cx, 0), mid-face. */
function polarBox(cx: number, r: number, deg: number): [[number, number, number], [number, number, number]] {
  const x = cx + r * Math.cos((deg * Math.PI) / 180);
  const y = r * Math.sin((deg * Math.PI) / 180);
  return [[x - 0.12, y - 0.12, 1], [x + 0.12, y + 0.12, 7]];
}

/** Tooth at phase, gap half a pitch on, tooth a full pitch on: the tooth pitch. */
function teethEvery(s: OcctBackend, cx: number, r: number, phase: number, pitchDeg: number): boolean {
  return fullIn(s, ...polarBox(cx, r, phase))
    && emptyIn(s, ...polarBox(cx, r, phase + pitchDeg / 2))
    && fullIn(s, ...polarBox(cx, r, phase + pitchDeg))
    && fullIn(s, ...polarBox(cx, r, phase + 90 + (90 % pitchDeg === 0 ? 0 : pitchDeg / 2)));
}

/** Ø5 bore with a 0.5 mm key flat on +X (flat at x = cx + 2). */
function keyedBore(s: OcctBackend, cx: number): boolean {
  return emptyIn(s, [cx - 2, -1, -0.1], [cx + 1.9, 1, 8.1])
    && emptyIn(s, [cx - 2.45, -0.3, -0.1], [cx - 2.35, 0.3, 8.1]) && fullIn(s, [cx - 2.7, -0.3, 0], [cx - 2.6, 0.3, 8])
    && fullIn(s, [cx + 2.05, -0.5, 0], [cx + 2.2, 0.5, 8]);
}

async function cookbookRecipeBuilds(): Promise<boolean> {
  const md = readFileSync(RECIPE, 'utf8');
  const code = /```typescript\n([\s\S]*?)```/.exec(md)?.[1];
  if (!code) return false;
  try {
    const r = await buildUsecase(RECIPE.replace(/\.md$/, '.kcad.ts'), code);
    return r.clean && r.parts.length === 2 && r.parts.every((p) => isClosedSolid(p.shape));
  } catch {
    return false;
  }
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, ['pinion', 'gear']);
  if (!gates['evaluates clean'] || !gates['parts: pinion, gear']) return { gates, scored: {} };
  const pinion = part(b, 'pinion');
  const gear = part(b, 'gear');
  const pb = bbox(pinion);
  const gb = bbox(gear);

  return {
    gates,
    scored: {
      'face width 8': [pb, gb].every((x) => near(x.min[2], 0) && near(x.max[2], 8)),
      'pinion tip Ø22, centred on the origin': near(pb.size[0], 22) && near(pb.size[1], 22)
        && near(pb.min[0] + pb.max[0], 0) && near(pb.min[1] + pb.max[1], 0),
      'gear tip Ø42, centre distance 30': near(gb.size[0], 42) && near(gb.size[1], 42)
        && near((gb.min[0] + gb.max[0]) / 2, 30) && near(gb.min[1] + gb.max[1], 0),
      'pinion: 20 teeth (18° pitch), tooth on +X': teethEvery(pinion, 0, 10.5, 0, 18),
      'gear: 40 teeth (9° pitch), turned half a tooth': teethEvery(gear, 30, 20.5, 4.5, 9)
        && emptyIn(gear, ...polarBox(30, 20.5, 180)),
      'teeth engage: gear reaches inside the pinion tip circle': materialIn(gear, [9, -3, 0], [11, 3, 8]) > 1,
      'gears do not overlap': pinion.intersectionVolume(gear) < 1e-6,
      'pinion Ø5 bore with key flat': keyedBore(pinion, 0),
      'gear Ø5 bore with key flat': keyedBore(gear, 30),
      ...(await standardExports(b, { solids: 2 })),
      'evaluate_script accepts the parts (mechanism gate on)': await evaluateScriptVerdict(scriptPath),
      'cookbook involute-spur-gear-pair recipe builds closed solid gears': await cookbookRecipeBuilds(),
    },
  };
}
