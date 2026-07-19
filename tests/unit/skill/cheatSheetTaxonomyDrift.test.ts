// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Drift sentinel for the task-organized cheat sheet. Untested prose rots: this
// repo shipped docs asserting "BRepProj_Projection is not bundled" in nine
// places, which was true when written, became false after a wasm rebuild, and
// told agents a shipped capability was impossible for months because nothing
// tested it. These assertions are what stop the cheat sheet repeating
// that: no API may go unclassified, no taxonomy name may be a typo, and the
// committed doc must equal freshly generated output.

import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  CHEAT_SHEET_TAXONOMY,
  API_ENTRY_SOURCES,
  allApiEntryNames,
} from '../../../src/agent/mcp/tools/cheatSheetTaxonomy';
import { API_ENTRY_COUNT } from '../../../src/agent/mcp/tools/listApi';
import { renderCheatSheet, CHEAT_SHEET_PATH } from '../../../scripts/buildCheatSheet';

const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '../../..');
const TAXONOMY_SRC = 'src/agent/mcp/tools/cheatSheetTaxonomy.ts';

describe('cheat sheet taxonomy drift sentinel', () => {
  it('every listApi entry has at least one task home', () => {
    const classified = new Set(CHEAT_SHEET_TAXONOMY.flatMap((g) => g.names));
    const orphans: string[] = [];
    for (const source of API_ENTRY_SOURCES) {
      for (const entry of source.entries) {
        if (!classified.has(entry.name)) orphans.push(`${source.label}.${entry.name}`);
      }
    }
    if (orphans.length > 0) {
      throw new Error(
        `${orphans.length} listApi entr(y|ies) have no task group, so agents cannot ` +
          `discover them by intent: ${orphans.join(', ')}. ` +
          `Add each name to the best-fitting group in ${TAXONOMY_SRC}, ` +
          'then run `npm run docs:cheatsheet`.',
      );
    }
  });

  it('every taxonomy name exists in listApi', () => {
    const known = new Set(allApiEntryNames());
    const unknown: string[] = [];
    for (const group of CHEAT_SHEET_TAXONOMY) {
      for (const name of group.names) {
        if (!known.has(name)) unknown.push(`${group.task} -> ${name}`);
      }
    }
    if (unknown.length > 0) {
      throw new Error(
        `${unknown.length} taxonomy name(s) do not exist in listApi — a typo, or an ` +
          `API that was renamed or removed: ${unknown.join(', ')}. ` +
          `Fix or drop the name in ${TAXONOMY_SRC}, then run \`npm run docs:cheatsheet\`.`,
      );
    }
  });

  it('no group is empty and no group duplicates a name within itself', () => {
    const problems: string[] = [];
    for (const group of CHEAT_SHEET_TAXONOMY) {
      if (group.names.length === 0) problems.push(`"${group.task}" is empty`);
      const dupes = group.names.filter((n, i) => group.names.indexOf(n) !== i);
      if (dupes.length > 0) {
        problems.push(`"${group.task}" lists ${[...new Set(dupes)].join(', ')} more than once`);
      }
      if (group.blurb.trim().length === 0) problems.push(`"${group.task}" has no blurb`);
    }
    if (problems.length > 0) {
      throw new Error(`Malformed taxonomy in ${TAXONOMY_SRC}: ${problems.join('; ')}.`);
    }
  });

  it('docs/cheat-sheet.md matches freshly generated output', () => {
    const committed = readFileSync(resolvePath(REPO_ROOT, CHEAT_SHEET_PATH), 'utf8');
    const generated = renderCheatSheet();
    if (committed !== generated) {
      const c = committed.split('\n');
      const g = generated.split('\n');
      // Scan the longer side: when one file is a strict prefix of the other
      // (an appended Uncategorized block), the short side has no differing line.
      const n = Math.max(c.length, g.length);
      let i = 0;
      while (i < n && c[i] === g[i]) i += 1;
      throw new Error(
        `${CHEAT_SHEET_PATH} is stale — it no longer matches the listApi data it is ` +
          `generated from. First difference at line ${i + 1}:\n` +
          `  committed: ${c[i] ?? '<end of file>'}\n` +
          `  generated: ${g[i] ?? '<end of file>'}\n` +
          'Run `npm run docs:cheatsheet` and commit the result. ' +
          'Never hand-edit the generated doc.',
      );
    }
  });

  it('API_ENTRY_COUNT counts exactly the arrays the taxonomy classifies', () => {
    // Ties the size listApi reports about itself to the set the cheat sheet
    // covers. Without it, an eleventh entry array could be added that
    // API_ENTRY_COUNT ignores and the taxonomy never classifies — the new calls
    // undiscoverable by intent, every gate still green. That is the failure that
    // let `~117` stand while the real figure reached 128.
    //
    // Compare ENTRY counts, not name counts: five names (union, subtract,
    // intersect, reflect, hermiteG2) exist on two receivers each, so the deduped
    // name list is legitimately shorter than the entry total.
    const entryTotal = API_ENTRY_SOURCES.reduce((n, s) => n + s.entries.length, 0);
    expect(API_ENTRY_COUNT).toBe(entryTotal);
  });
});
