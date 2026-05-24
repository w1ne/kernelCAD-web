// tests/integration/mcp/stringsAsSugarRoundtrip.test.ts
//
// Q7 corpus golden — every @kc[...] ref shipped anywhere in the repo
// (examples/, eval/, src/agent/skills/, tests/, docs/demos/) routes
// cleanly through the strings-as-sugar dispatcher (parseAnyTopologyInput)
// and yields a Query value. This IS the migration shim's regression
// gate: if any pre-Q7 ref site breaks, this test fires.
//
// Edge / sketch refs that fire diagnostic codes are NOT regressions —
// per cumulative finding #33 the Query evaluator's edge/vertex/connector
// branches ship in a follow-up slice; per topoRefAsQuery sketches throw
// query.unsupported-entity-type. Those well-known diagnostic codes are
// tolerated and counted separately.

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { parseAnyTopologyInput } from '../../../src/kernel/naming/parseAnyTopologyInput';
import { KernelError } from '../../../src/shared/intent/kernelError';

const ROOTS = ['examples', 'eval', 'src/agent/skills', 'tests', 'docs/demos'];
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** Walk the repo and collect every literal @kc[...] ref. Honours inner
 *  brackets (e.g. mountingHoles[2]) via depth tracking — the same scan
 *  parseTopoRef uses. Filters out grammar templates (refs containing
 *  '<', '...', or starting with '.') so the corpus is the real ref set
 *  the shim must keep working. */
async function collectAtKcRefs(): Promise<{ file: string; line: number; ref: string }[]> {
  const hits: { file: string; line: number; ref: string }[] = [];
  for (const root of ROOTS) {
    const abs = path.join(REPO_ROOT, root);
    try {
      await fs.access(abs);
    } catch {
      continue;
    }
    await walk(abs, hits);
  }
  return hits;
}

async function walk(
  dir: string,
  out: { file: string; line: number; ref: string }[],
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      await walk(full, out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name);
      if (!['.ts', '.tsx', '.js', '.md', '.kcad.ts', '.txt'].some((s) => e.name.endsWith(s))) {
        continue;
      }
      let txt: string;
      try {
        txt = await fs.readFile(full, 'utf8');
      } catch {
        continue;
      }
      if (!txt.includes('@kc[')) continue;
      const lines = txt.split('\n');
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx]!;
        let pos = 0;
        while (true) {
          const start = line.indexOf('@kc[', pos);
          if (start < 0) break;
          // Depth-aware scan to find the matching ']'.
          let depth = 1;
          let cursor = start + 4;
          while (cursor < line.length && depth > 0) {
            const ch = line[cursor];
            if (ch === '[') depth++;
            else if (ch === ']') depth--;
            cursor++;
          }
          if (depth === 0) {
            const ref = line.slice(start, cursor);
            const body = ref.slice(4, -1);
            // Skip grammar templates and obvious non-refs.
            if (!body || body.includes('<') || body.includes('...') || body.startsWith('.')) {
              pos = cursor;
              continue;
            }
            // Reject body characters outside the documented grammar.
            if (!/^[A-Za-z][A-Za-z0-9_/.#\[\]-]*$/.test(body)) {
              pos = cursor;
              continue;
            }
            out.push({ file: path.relative(REPO_ROOT, full), line: lineIdx + 1, ref });
            pos = cursor;
          } else {
            break;
          }
        }
      }
    }
  }
}

describe('Q7 corpus snapshot — every shipped @kc[...] ref still routes through parseAnyTopologyInput', () => {
  it('collects a non-trivial corpus from the repo (sanity gate)', async () => {
    const hits = await collectAtKcRefs();
    // The audit-grep at task start found 32 unique real refs across
    // ~70 occurrences. The corpus is the regression surface for the
    // shim; if it shrinks below ~20 the extractor is broken.
    expect(hits.length).toBeGreaterThan(20);
  });

  it('every collected @kc[...] either routes through the dispatcher cleanly OR fires a known follow-up-slice diagnostic', async () => {
    const hits = await collectAtKcRefs();
    const regressions: string[] = [];
    const tolerated: string[] = []; // edge/sketch refs in scope of finding #33
    const resolved: string[] = [];

    // Diagnostic codes that are EXPECTED to fire on certain refs — these
    // are NOT regressions, they're documented punts per cumulative
    // findings #33 (edge-history wiring deferred) + topoRefAsQuery's
    // explicit sketch rejection.
    const TOLERATED_CODES = new Set<string>([
      'query.unsupported-entity-type',
    ]);

    // Pre-existing parseTopoRef grammar limitation (verified at task
    // start): segments must start with a letter, so synthetic shopcheck
    // refs like `@kc[bracket/face/top/web/0]` that use numeric tail
    // segments fail parseTopoRef even pre-Q7. Those refs are stored as
    // opaque shopcheck-finding ID strings and never routed through the
    // parser in production — the corpus-grep just happens to see them.
    // Tolerated so this gate stays focused on Q7's actual regression
    // surface (the shim, not the F-foundation grammar).
    const PRE_EXISTING_GRAMMAR_REJECTIONS = (msg: string): boolean =>
      /segment name '\d+' does not match the grammar/.test(msg);

    for (const hit of hits) {
      const tag = `${hit.file}:${hit.line}: ${hit.ref}`;
      try {
        const q = parseAnyTopologyInput(hit.ref);
        if (q._kind !== 'kc.query') {
          regressions.push(`${tag} — dispatcher returned non-Query value`);
        } else {
          resolved.push(tag);
        }
      } catch (e) {
        if (e instanceof KernelError && TOLERATED_CODES.has(e.code)) {
          tolerated.push(`${tag} — ${e.code}`);
        } else if (
          e instanceof KernelError &&
          e.code === 'query.invalid-syntax' &&
          PRE_EXISTING_GRAMMAR_REJECTIONS((e as Error).message)
        ) {
          tolerated.push(`${tag} — pre-existing parseTopoRef grammar (numeric tail segment)`);
        } else {
          regressions.push(`${tag} — ${(e as Error).message}`);
        }
      }
    }

    if (regressions.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `Q7 corpus round-trip regressions (must be 0 — the shim is supposed to preserve every shipped ref):\n${regressions
          .slice(0, 40)
          .join('\n')}`,
      );
    }
    expect(regressions).toEqual([]);
    // The migration shim's promise (D0.1 (c)) is that strings are sugar
    // for Queries — every ref that resolved pre-Q7 still resolves post-Q7,
    // or fires a documented per-finding diagnostic. The combination of
    // 'resolved' + 'tolerated' equals the full corpus.
    expect(resolved.length + tolerated.length).toBe(hits.length);
  });
});
