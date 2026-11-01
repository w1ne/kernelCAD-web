// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Spike (b2b wedge A): board JSON -> enclosure .kcad.ts. Replaces ONLY the
// `// @board-begin` ... `// @board-end` block of enclosure.kcad.ts with the
// board description; every other line of the source is shared.
//
//   npx tsx spike-b2b/enclosure/generate.ts spike-b2b/enclosure/boards/*.json
//
// Writes spike-b2b/enclosure/out/<board>/<board>.kcad.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, 'enclosure.kcad.ts');
const BLOCK = /\/\/ @board-begin\n[\s\S]*?\n\/\/ @board-end/;

export function enclosureSource(board: unknown, template = readFileSync(TEMPLATE, 'utf8')): string {
  if (!BLOCK.test(template)) throw new Error('enclosure.kcad.ts lost its @board-begin/@board-end markers');
  const { note: _note, ...data } = board as Record<string, unknown>;
  const block = `// @board-begin\nconst BOARD = ${JSON.stringify(data, null, 2)};\n// @board-end`;
  return template.replace(BLOCK, () => block);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const file of process.argv.slice(2)) {
    const board = JSON.parse(readFileSync(file, 'utf8')) as { name: string };
    const outDir = join(HERE, 'out', board.name);
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, `${board.name}.kcad.ts`);
    writeFileSync(out, enclosureSource(board));
    console.log(`wrote ${out}`);
  }
}
