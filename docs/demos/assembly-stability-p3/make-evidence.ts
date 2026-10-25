// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regenerate stable evidence for the P3 demo from the real verifier:
//   npx tsx docs/demos/assembly-stability-p3/make-evidence.ts
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkAssemblyPathTool } from '../../../src/agent/mcp/tools/checkAssemblyPath';

const HERE = dirname(new URL(import.meta.url).pathname);
const SOURCE = 'examples/assemblies/assembly-stability-bracket.kcad.ts';
const TARGET = join(HERE, 'stability-evidence.json');

async function main(): Promise<void> {
    const source = readFileSync(SOURCE);
    const result = await checkAssemblyPathTool({ file: SOURCE, sequence: true, stability: true });
    if ('error' in result)
        throw new Error(result.error);
    writeFileSync(TARGET, JSON.stringify({
        checkedAt: new Date().toISOString(),
        command: "verify({ check: 'assembly-path', file: 'examples/assemblies/assembly-stability-bracket.kcad.ts', sequence: true, stability: true })",
        source: SOURCE,
        sourceSha256: createHash('sha256').update(source).digest('hex'),
        model: result.model,
        steps: result.sequence?.steps,
        needsHold: result.sequence?.needsHold ?? [],
        unknown: result.sequence?.unknown ?? [],
        ok: result.ok,
        limitations: result.limitations,
    }, null, 2) + '\n');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
