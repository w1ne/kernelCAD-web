// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Every recovery hint must route to a tool the server actually registers.
// A nextAction naming a retired tool (list_edges, list_faces, …) sends the
// agent to a call that fails with "Unknown tool".
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TOOL_REGISTRY, getToolByName, getToolDefinition } from './toolRegistry';
import { RETIRED_TOOL_NAMES } from './retiredToolNames';
import { DIAGNOSTIC_REGISTRY } from '../../shared/diagnostics/registry';
import { withNextAction, type CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { RETIRED_INTROSPECTION_CALLS } from '../../shared/diagnostics/liveToolRouting';

const ROOT = resolve(__dirname, '../../../');
const REGISTERED = new Set(TOOL_REGISTRY.map((e) => e.definition.name));

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.') || name === '__tests__') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

/** `{ kind: 'call-tool' | 'call-introspection-tool', tool: '<name>' … }` literals in source. */
const NEXT_ACTION_TOOL_LITERAL = /kind:\s*['"]call-(?:introspection-)?tool['"],\s*tool:\s*['"]([A-Za-z_]+)['"]/g;

describe('nextAction tool routing', () => {
  it('every registry nextAction.tool is a registered tool', () => {
    const offenders: string[] = [];
    for (const [code, spec] of Object.entries(DIAGNOSTIC_REGISTRY)) {
      const next = spec.nextAction;
      if ('tool' in next && !REGISTERED.has(next.tool)) offenders.push(`${code} → ${next.tool}`);
    }
    expect(offenders).toEqual([]);
  });

  it('every nextAction tool literal anywhere in src is a registered tool', () => {
    const offenders: string[] = [];
    let seen = 0;
    for (const file of walk(join(ROOT, 'src'))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(NEXT_ACTION_TOOL_LITERAL)) {
        seen++;
        if (!REGISTERED.has(m[1])) offenders.push(`${file.replace(`${ROOT}/`, '')}: ${m[1]}`);
      }
    }
    expect(seen).toBeGreaterThan(5);
    expect(offenders).toEqual([]);
  });

  it('no registry hint names a retired tool', () => {
    const patterns = Object.keys(RETIRED_TOOL_NAMES).map((n) => [n, new RegExp(String.raw`\b${n}\b`)] as const);
    const offenders: string[] = [];
    for (const [code, spec] of Object.entries(DIAGNOSTIC_REGISTRY)) {
      const text = `${spec.hintTemplate}\n${'guidance' in spec.nextAction ? spec.nextAction.guidance : ''}`;
      for (const [name, re] of patterns) if (re.test(text)) offenders.push(`${code}: ${name}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the wire-boundary rewrite map only covers retired names, mapped to inspect', () => {
    for (const [name, call] of Object.entries(RETIRED_INTROSPECTION_CALLS)) {
      expect(RETIRED_TOOL_NAMES, name).toHaveProperty(name);
      expect(call.startsWith('inspect(')).toBe(true);
    }
  });
});

describe('withNextAction routes selection misses to live inspect calls', () => {
  const base = (message: string, hint: string): CompilerDiagnostic => ({
    target: 'export-occt',
    code: 'feature.selection.no-match',
    severity: 'error',
    message,
    hint,
  });

  it('a face-query miss inspects faces, and the kernel hint prose is rewritten', () => {
    const d = withNextAction(base(
      'Face query matched zero faces on the input shape.',
      'Inspect available faces with list_faces, or relax the FaceQuery.',
    ));
    expect(d.nextAction).toEqual({ kind: 'call-tool', tool: 'inspect', args: { of: 'faces' } });
    expect(d.hint).toBe("Inspect available faces with inspect({ of: 'faces' }), or relax the FaceQuery.");
    expect(d.hint).not.toMatch(/\blist_faces\b/);
  });

  it('an edge-query miss inspects edges', () => {
    const d = withNextAction(base('selectEdge: no edges matched query (zero results)', 'Relax the query.'));
    expect(d.nextAction).toEqual({ kind: 'call-tool', tool: 'inspect', args: { of: 'edges' } });
  });

  it('a label miss routes retired names in the message too', () => {
    const d = withNextAction(base(
      "Label matched zero faces at the consumer. Use list_face_labels or list_faces to inspect candidates.",
      'Inspect candidates with list_face_labels or list_faces, then refine the FaceQuery.',
    ));
    expect(d.message).not.toMatch(/\blist_face/);
    expect(d.hint).toContain("inspect({ of: 'face-labels' })");
    expect(d.nextAction).toMatchObject({ tool: 'inspect', args: { of: 'faces' } });
  });

  it('an explicit nextAction and clean prose pass through unchanged (identity)', () => {
    const d: CompilerDiagnostic = {
      ...base('Face query matched zero faces.', 'Relax it.'),
      nextAction: { kind: 'inspect-message' },
    };
    expect(withNextAction(d)).toBe(d);
  });
});

describe('getToolByName (order-independent lookup for kernelCAD-server)', () => {
  it('resolves every registered tool to its handler and merged definition', () => {
    for (const entry of TOOL_REGISTRY) {
      const byName = getToolByName(entry.definition.name);
      expect(byName?.handler).toBe(entry.handler);
      expect(byName?.definition).toEqual(getToolDefinition(entry.definition.name));
    }
    expect(getToolByName('list_edges')).toBeUndefined();
  });
});
