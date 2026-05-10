// src/cli/commands/interference.ts
//
// `kernelcad interference <file.kcad.ts>` — pairwise BREP clash detection
// over an assembly Scene. Industry-standard interference detection (see
// Fusion 360 Inspect → Interference, Onshape Interference, SolidWorks
// Tools → Evaluate → Interference Detection).
//
// Exit code: 0 if no interference, 1 on clash. Pipe-friendly:
//
//   kernelcad interference robot-arm.kcad.ts && echo "ok"

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { initOcct } from '../../backends/occt/occtBackend';
import { checkInterference, pairKey } from '../../script-runtime/checkInterference';
import { formatHuman } from '../../diagnostics/formatter';

export interface InterferenceCliInput {
  file: string;
  epsilon: number;
  ignore: string[];
  json: boolean;
}

export interface InterferenceCliResult {
  exitCode: number;
}

export async function runInterferenceCli(input: InterferenceCliInput): Promise<InterferenceCliResult> {
  await initOcct();

  let code: string;
  try {
    code = await readFile(resolve(input.file), 'utf8');
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 2 };
  }

  // Parse `--ignore A,B` flags into a Set<pairKey>.
  const ignorePairs = new Set<string>();
  for (const raw of input.ignore) {
    const [a, b] = raw.split(',').map((s) => s.trim());
    if (!a || !b) {
      console.error(`Invalid --ignore value '${raw}'. Expected 'partA,partB'.`);
      return { exitCode: 2 };
    }
    ignorePairs.add(pairKey(a, b));
  }

  const r = await checkInterference({
    code,
    fileName: input.file,
    epsilonMm3: input.epsilon,
    ignorePairs,
  });

  if (input.json) {
    console.log(JSON.stringify({
      ok: r.pairs.length === 0,
      partCount: r.partCount,
      comparisonCount: r.comparisonCount,
      epsilonMm3: input.epsilon,
      pairs: r.pairs,
      diagnostics: r.diagnostics,
    }, null, 2));
  } else {
    if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
    if (r.partCount === 0) {
      console.log('No assembly Scene to check (script returned a Shape, not a Scene).');
      return { exitCode: 0 };
    }
    if (r.pairs.length === 0) {
      console.log(`No interferences detected (${r.partCount} parts, ${r.comparisonCount} comparisons, ε=${input.epsilon}mm³).`);
    } else {
      console.error(`Detected ${r.pairs.length} interference${r.pairs.length === 1 ? '' : 's'} in ${r.partCount}-part assembly:`);
      for (const p of r.pairs) {
        console.error(`  ${p.a}  ↔  ${p.b}    ${p.volumeMm3.toFixed(3)} mm³`);
      }
    }
  }
  return { exitCode: r.pairs.length === 0 ? 0 : 1 };
}

export function interferenceCommand(): Command {
  const cmd = new Command('interference')
    .description('Detect BREP interferences between Scene parts (industry-standard clash detection)')
    .argument('<file>', 'path to .kcad.ts script')
    .option('--epsilon <mm3>', 'volume threshold below which an intersection is "touching"', (v) => parseFloat(v), 0.01)
    .option('--ignore <pair>', 'skip a pair (format: "partA,partB"); repeatable', (v: string, prev: string[]) => [...prev, v], [] as string[])
    .option('--json', 'emit results as JSON')
    .action(async (file: string, opts: { epsilon: number; ignore: string[]; json?: boolean }) => {
      const r = await runInterferenceCli({
        file,
        epsilon: opts.epsilon,
        ignore: opts.ignore,
        json: opts.json ?? false,
      });
      process.exitCode = r.exitCode;
    });
  return cmd;
}
