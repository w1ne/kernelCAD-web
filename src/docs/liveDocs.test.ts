// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The docs page model must stay derived from the taxonomy and listApi. If a
// page ever starts carrying its own copy of a signature, these fail.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDocsPages, slugForTask } from './liveDocs';
import { CHEAT_SHEET_TAXONOMY, resolveEntry } from '../agent/mcp/tools/cheatSheetTaxonomy';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('docs page model', () => {
  const pages = buildDocsPages();

  it('emits exactly one page per taxonomy group, in taxonomy order', () => {
    expect(pages.map((p) => p.task)).toEqual(CHEAT_SHEET_TAXONOMY.map((g) => g.task));
  });

  it('uses the same slug rule as the cheat sheet anchors', () => {
    // buildCheatSheet.ts links `#finish-edges`; the docs page is
    // `/docs/finish-edges.html`. One rule, so the two never diverge.
    for (const group of CHEAT_SHEET_TAXONOMY) {
      const anchor = group.task.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ /g, '-');
      expect(slugForTask(group.task)).toBe(anchor);
    }
    expect(new Set(pages.map((p) => p.slug)).size).toBe(pages.length);
  });

  it('gives every page at least one call, all resolved from listApi', () => {
    for (const page of pages) {
      expect(page.entries.length, `${page.task} has no calls`).toBeGreaterThan(0);
    }
  });

  it('takes every signature and summary verbatim from listApi', () => {
    // Spot-check the whole surface rather than a sample: every rendered row
    // must be reconstructible from listApi alone.
    for (const group of CHEAT_SHEET_TAXONOMY) {
      const page = pages.find((p) => p.task === group.task)!;
      const expected: string[] = [];
      for (const name of group.names) {
        for (const { source, entry } of resolveEntry(name)) {
          expected.push(
            `${source.callPrefix}${entry.name}${
              entry.signature.startsWith('(') ? entry.signature : ` : ${entry.signature}`
            }`,
          );
        }
      }
      expect(page.entries.map((e) => e.call)).toEqual(expected);
    }
  });

  it('authors no API prose of its own', () => {
    // The only strings in this module should be captions, notes and example
    // code. A signature literal here means someone typed an API by hand, which
    // is how a doc starts lying about the runtime.
    const source = readFileSync(resolve(HERE, 'liveDocs.ts'), 'utf8');
    expect(source).not.toMatch(/=>\s*Shape\b/);
    expect(source).not.toMatch(/Editable<number>/);
  });

  it('marks the filesystem-only group as having no runnable example', () => {
    // `lib.fromSTEP` and friends throw cli.host-fs-unavailable in a browser.
    // Shipping an example that always errors would be worse than shipping none.
    const importExport = pages.find((p) => p.task === 'Import & export')!;
    expect(importExport.example).toBeNull();
    expect(importExport.note).toMatch(/cli\.host-fs-unavailable/);
  });

  it('gives every other group a runnable example', () => {
    for (const page of pages) {
      if (page.task === 'Import & export') continue;
      expect(page.example, `${page.task} has no example`).not.toBeNull();
      expect(page.example!.caption.length).toBeGreaterThan(20);
    }
  });
});
