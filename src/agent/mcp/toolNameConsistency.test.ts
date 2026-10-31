// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TOOLS } from './toolRegistry';
import { TOOL_ANNOTATIONS } from './toolAnnotations';
import { TOOL_TITLES } from './toolTitles';
import { RETIRED_TOOL_NAMES } from './retiredToolNames';

// Repo root relative to this file: src/agent/mcp → ../../../
const ROOT = resolve(__dirname, '../../../');

/** Directories whose files reference MCP tool names by bare/backticked string. */
const REFERENCE_DIRS = ['src/agent/skills', 'eval', 'docs'];

/**
 * Individual teaching-prose files outside REFERENCE_DIRS.
 *
 * `listApi.ts` is the prose `lookup_api` hands straight to agents, and it sat
 * unscanned while carrying a retired tool name (`list_faces`). That only
 * surfaced when `docs/cheat-sheet.md` — GENERATED from this very prose — landed
 * in an already-scanned directory. The gate was checking the copy and not the
 * original.
 *
 * Scoped to specific files rather than all of `src/agent/mcp/tools`: the sibling
 * implementations (`inspect.ts`, `verify.ts`, `query.ts`, `export.ts`) carry
 * legitimate "Replaces inspect_assembly, list_faces, …" headers naming exactly
 * what they superseded. Scanning the whole directory produced 28 such false
 * positives — a gate everyone learns to ignore is worse than no gate.
 */
const REFERENCE_FILES = ['src/agent/mcp/tools/listApi.ts'];
const REFERENCE_EXTS = ['.md', '.ts', '.json'];

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc; // dir absent in this checkout — skip
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (REFERENCE_EXTS.some(e => name.endsWith(e))) acc.push(full);
  }
  return acc;
}

function referenceFiles(): string[] {
  return [
    ...REFERENCE_DIRS.flatMap(d => walk(join(ROOT, d))),
    ...REFERENCE_FILES.map(f => join(ROOT, f)),
  ];
}

describe('tool-name consistency', () => {
  it('no reference surface mentions a retired tool name', () => {
    const retired = Object.keys(RETIRED_TOOL_NAMES);
    if (retired.length === 0) return; // nothing retired yet
    const patterns = retired.map(n => [n, new RegExp(`\\b${n}\\b`)] as const);
    const offenders: string[] = [];
    for (const file of referenceFiles()) {
      const text = readFileSync(file, 'utf8');
      for (const [name, re] of patterns) {
        if (re.test(text)) {
          offenders.push(`${file.replace(ROOT + '/', '')}: '${name}' → ${RETIRED_TOOL_NAMES[name]}`);
        }
      }
    }
    expect(
      offenders,
      `Retired tool names still referenced in teaching surfaces:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('no surviving tool description references a retired tool name', () => {
    const retired = Object.keys(RETIRED_TOOL_NAMES);
    if (retired.length === 0) return;
    const offenders: string[] = [];
    for (const tool of TOOLS) {
      const text = JSON.stringify(tool); // name + description + schema prose
      for (const name of retired) {
        if (new RegExp(`\\b${name}\\b`).test(text)) {
          offenders.push(`tool '${tool.name}' references retired '${name}' → ${RETIRED_TOOL_NAMES[name]}`);
        }
      }
    }
    expect(offenders, `Retired names leaked into live tool definitions:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no code dispatches a retired tool name via callMcpTool / getToolDefinition', () => {
    // Functional breakage class: a test or source that calls a retired name by
    // string through the registry throws "Unknown tool" at runtime. The docs
    // checks above don't cover this — call sites live in src/ and tests/.
    const retired = Object.keys(RETIRED_TOOL_NAMES);
    if (retired.length === 0) return;
    const codeFiles = ['src', 'tests'].flatMap(d =>
      walk(join(ROOT, d)).filter(f => f.endsWith('.ts')),
    );
    const offenders: string[] = [];
    for (const file of codeFiles) {
      if (file.endsWith('retiredToolNames.ts') || file.endsWith('toolNameConsistency.test.ts')) continue;
      const text = readFileSync(file, 'utf8');
      for (const name of retired) {
        // String-literal dispatch through the registry or a spawned MCP server:
        // callMcpTool('name' | getToolDefinition('name' | callTool('name' (the
        // spawn-test JSON-RPC helper — this one bit us on CI, where the bundle
        // is built and the call actually runs).
        const re = new RegExp(`(callMcpTool|getToolDefinition|callTool)\\(\\s*['"\`]${name}['"\`]`);
        if (re.test(text)) {
          offenders.push(`${file.replace(ROOT + '/', '')}: dispatches retired '${name}' → ${RETIRED_TOOL_NAMES[name]}`);
        }
      }
    }
    expect(offenders, `Retired tool names dispatched in code:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every registry tool name is unique and snake_case', () => {
    const names = TOOLS.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('every tool description starts with "Use this when" (ChatGPT-discovery metadata convention)', () => {
    const offenders = TOOLS
      .filter(t => !/^Use this when/i.test(t.description.trimStart()))
      .map(t => t.name);
    expect(offenders, `Tool descriptions must start with "Use this when…":\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every tool carries a title and readOnly/destructive/openWorld hints (directory requirement)', () => {
    // Anthropic Connectors Directory wants human titles; OpenAI Apps SDK rejects
    // missing action labels. Fail fast if either a title or a hint is absent.
    const offenders = TOOLS
      .filter(t => {
        const title = (t as { title?: unknown }).title
          ?? (t as { annotations?: { title?: unknown } }).annotations?.title;
        const a = (t as { annotations?: Record<string, unknown> }).annotations;
        const hasTitle = typeof title === 'string' && title.trim().length > 0;
        const hasHints = !!a
          && typeof a.readOnlyHint === 'boolean'
          && typeof a.destructiveHint === 'boolean'
          && typeof a.openWorldHint === 'boolean';
        return !hasTitle || !hasHints;
      })
      .map(t => t.name);
    expect(offenders, `Tools missing title or behavioral annotations:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('TOOL_ANNOTATIONS covers exactly the registered tool names (no retired leftovers)', () => {
    const registered = new Set(TOOLS.map(t => t.name));
    const annotated = new Set(Object.keys(TOOL_ANNOTATIONS));
    const missing = [...registered].filter(n => !annotated.has(n)).sort();
    const extra = [...annotated].filter(n => !registered.has(n)).sort();
    expect({ missing, extra }, 'annotation map must match TOOLS 1:1').toEqual({ missing: [], extra: [] });
  });

  it('TOOL_TITLES covers every registered tool', () => {
    const offenders = TOOLS.filter(t => !TOOL_TITLES[t.name]).map(t => t.name);
    expect(offenders, `Tools missing curated titles:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every tool declares an outputSchema (structured-output metadata)', () => {
    const offenders = TOOLS
      .filter(t => { const o = (t as { outputSchema?: { type?: string } }).outputSchema; return !o || o.type !== 'object'; })
      .map(t => t.name);
    expect(offenders, `Tools missing outputSchema:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('surfacing tools lead with intent keywords (organic/freeform/body/shell/…)', () => {
    const INTENT = /organic|freeform|body shell|body silhouette|panel|fairing|sculpt|swept/i;
    const SURFACING = ['add_surface', 'add_curve', 'add_path_segment', 'add_variable_sweep'];
    const offenders = TOOLS
      .filter(t => SURFACING.includes(t.name))
      .filter(t => !INTENT.test(t.description.slice(0, 160)))
      .map(t => t.name);
    expect(offenders, `Surfacing tool descriptions must name an organic-shape intent:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('lookup_api nudges the agent to check before declaring a missing capability', () => {
    const t = TOOLS.find(x => x.name === 'lookup_api')!;
    expect(t.description).toMatch(/before concluding kernelCAD lacks/i);
  });
});
