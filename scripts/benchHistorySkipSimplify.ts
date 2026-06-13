// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/benchHistorySkipSimplify.ts
import { evaluateScript } from '../src/agent/cli/commands/evaluate';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolvePath(__dirname, '..');

const SCRIPTS = [
  'examples/bench/box-minus-cylinder.kcad.ts',
  'examples/bench/box-minus-divider.kcad.ts',
  'examples/bench/two-boxes-fused.kcad.ts',
  'examples/bench/cylinder-intersected.kcad.ts',
  'examples/bench/nested-booleans.kcad.ts',
];

async function main() {
  console.log('script | exit | features | diagnostics');
  console.log('---|---|---|---');
  for (const rel of SCRIPTS) {
    const file = resolvePath(REPO, rel);
    const result = await evaluateScript({ file });
    const diagCount = result.diagnostics?.length ?? 0;
    console.log(`${rel} | ${result.exitCode} | ${result.featureCount ?? '-'} | ${diagCount}`);
  }
  console.log('\nAll bench scripts completed. If any exit code is non-zero or diagnostic count is non-zero, investigate.');
}

main().catch((e) => { console.error(e); process.exit(1); });
