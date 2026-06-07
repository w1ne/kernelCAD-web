// Skill-markdown drift gate.
//
// Greps `src/agent/skills/**/*.md` for fully-qualified diagnostic-code
// literals (group.subgroup.detail) and asserts each appears in
// DIAGNOSTIC_REGISTRY — i.e. the skill files never invent a code that the
// kernel does not actually emit.
//
// Historically the assembly validators emitted a parallel set of codes
// that lived in local unions (`ValidatorDiagnosticCode`,
// `PoseEnvelopeDiagnosticCode`, `MechanicalPlausibilityDiagnostic`) and
// the gate kept a KNOWN_ORPHANS allowlist for the 24 codes that flowed
// outside the registry. That allowlist is now empty: every assembly
// diagnostic code is registered in DIAGNOSTIC_REGISTRY and the parallel
// unions are derived from it via `Extract<DiagnosticCode, ...>`.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve as resolvePath, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = resolvePath(__dirname, '../../../src/agent/skills');

// Retained as a (now-empty) allowlist so future deliberate orphans can be
// recorded here with a follow-up note rather than silently passing the
// gate. The "stale allowlist" guard below fails CI if anything in here
// becomes registered, keeping the set honest.
const KNOWN_ORPHANS: ReadonlySet<string> = new Set<string>();

// Match `<group>.<segment>.<segment>(.<segment>)*` where group is one of the
// known top-level namespaces. Requires at least one inner dot so we don't
// false-positive on `feature.bend` (a phrase about bends) — fully-qualified
// codes always have at least two dots.
const CODE_LITERAL_RE =
  /\b(feature|sketch|recompute|cli|export|assembly|kinematic|animation)\.[a-z][a-z0-9-]+(?:\.[a-z0-9-]+)+\b/g;

function listMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      out.push(...listMarkdownFiles(p));
    } else if (entry.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

function literalsInSkillMd(): Set<string> {
  const codes = new Set<string>();
  for (const file of listMarkdownFiles(SKILLS_DIR)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(CODE_LITERAL_RE)) codes.add(m[0]);
  }
  return codes;
}

describe('skill markdown diagnostic-code literals are catalogued', () => {
  const registry = new Set<string>(Object.keys(DIAGNOSTIC_REGISTRY));

  it('every diagnostic-code literal in src/agent/skills/**/*.md is in DIAGNOSTIC_REGISTRY or a KNOWN_ORPHAN', () => {
    const literals = [...literalsInSkillMd()].sort();
    const novelOrphans = literals.filter(
      (c) => !registry.has(c) && !KNOWN_ORPHANS.has(c),
    );
    expect(
      novelOrphans,
      `New diagnostic-code literal(s) appeared in src/agent/skills/**/*.md that are neither in DIAGNOSTIC_REGISTRY nor in the KNOWN_ORPHANS allowlist: ${JSON.stringify(novelOrphans)}.\nAdd the code to DIAGNOSTIC_REGISTRY, or — if it's deliberately outside the kernel diagnostic vocabulary — add it to KNOWN_ORPHANS with a follow-up note.`,
    ).toEqual([]);
  });

  it('KNOWN_ORPHANS does not list anything already in DIAGNOSTIC_REGISTRY (stale allowlist guard)', () => {
    const stale = [...KNOWN_ORPHANS].filter((c) => registry.has(c)).sort();
    expect(
      stale,
      `KNOWN_ORPHANS contains code(s) that ARE in DIAGNOSTIC_REGISTRY now: ${JSON.stringify(stale)}. Remove them from KNOWN_ORPHANS.`,
    ).toEqual([]);
  });
});
