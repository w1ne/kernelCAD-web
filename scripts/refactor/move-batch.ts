#!/usr/bin/env tsx
/**
 * Atomic move-batch: read a mapping JSON, perform filesystem moves,
 * then run the codemod. Either everything succeeds or the script aborts
 * before mutating imports.
 *
 * Usage: npx tsx scripts/refactor/move-batch.ts docs/migrations/refactor-mappings/pr1-shared.json
 * (Past PR mapping JSONs are archived under docs/migrations/refactor-mappings/.)
 */
import { readFile, rename, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { rewriteImports } from './codemod';

async function main() {
  const [, , mappingPath] = process.argv;
  if (!mappingPath) {
    console.error('Usage: move-batch.ts <mapping.json>');
    process.exit(1);
  }
  const projectRoot = process.cwd();
  const raw = await readFile(mappingPath, 'utf8');
  const mapping: Record<string, string> = JSON.parse(raw);

  // Phase 1: validate everything exists and destinations are free.
  for (const [from, to] of Object.entries(mapping)) {
    const fromAbs = resolve(projectRoot, from);
    const toAbs = resolve(projectRoot, to);
    await stat(fromAbs); // throws if missing
    try {
      await stat(toAbs);
      throw new Error(`Destination already exists: ${to}`);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }

  // Phase 2: ensure parent dirs, then rename.
  for (const [from, to] of Object.entries(mapping)) {
    const fromAbs = resolve(projectRoot, from);
    const toAbs = resolve(projectRoot, to);
    await mkdir(dirname(toAbs), { recursive: true });
    await rename(fromAbs, toAbs);
  }

  // Phase 3: rewrite imports.
  await rewriteImports({ projectRoot, mapping });

  console.log(`Moved ${Object.keys(mapping).length} files and rewrote imports.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
