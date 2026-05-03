#!/usr/bin/env node
import { loadSnippets } from '../src/cookbook/index';
import { evaluateScript, isKernelcadAvailable } from '../eval/oracle/kernelcad-client';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main(): Promise<void> {
  const available = await isKernelcadAvailable();
  if (!available) {
    if (process.env.CI) {
      console.error('✗ kernelcad CLI not available in CI. Run `npm run build:cli` first or set KERNELCAD_BIN.');
      process.exit(1);
    }
    console.error('⚠ kernelcad CLI not available; skipping cookbook:evaluate (set CI=1 to fail loudly).');
    process.exit(0);
  }

  const snippets = loadSnippets();
  const tmp = mkdtempSync(join(tmpdir(), 'cookbook-eval-'));
  let failed = 0;

  for (const s of snippets) {
    const file = join(tmp, `${s.id}.kcad.ts`);
    writeFileSync(file, s.body);
    const r = await evaluateScript(file);
    if (r.ok) {
      console.log(`✓ ${s.id}`);
    } else {
      failed++;
      console.error(`✗ ${s.id}`);
      for (const d of r.diagnostics) {
        console.error(`    ${d.code}: ${d.message}`);
      }
    }
  }

  rmSync(tmp, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`\n✗ ${failed} of ${snippets.length} snippet(s) failed evaluate`);
    process.exit(1);
  }
  console.log(`\n✓ all ${snippets.length} snippet bodies evaluate clean`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
