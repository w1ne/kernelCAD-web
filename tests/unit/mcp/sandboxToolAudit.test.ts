// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox audit over the WHOLE MCP tool surface.
//
// 1. Coverage: walk every registered tool's inputSchema (nested objects,
//    array items, oneOf/anyOf/allOf, if/then/else) and find every argument that
//    looks like a filesystem path or a URL — by name (file, path, dir, out,
//    url, font, environment …) or by description ("path to", "{ file }").
//    Each must be classified in MCP_SANDBOX_ARGS (src/agent/mcp/sandboxArgs.ts)
//    or listed in NOT_A_PATH below with the reason. A new path-taking argument
//    therefore cannot ship unguarded.
// 2. No stale entries: every classified selector names a real schema argument.
// 3. Enforcement: for every classified argument, `callMcpTool` under sandbox
//    mode refuses an escaping value with the registered sandbox code before
//    the handler runs; workspace-relative values pass the guard.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TOOLS, callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import {
  MCP_SANDBOX_ARGS,
  MCP_SANDBOX_REFUSED_TOOLS,
  guardMcpToolArgs,
  sandboxToolDefinition,
  type SandboxArgKind,
} from '../../../src/agent/mcp/sandboxArgs';
import { disableSandboxForTest, enableSandbox } from '../../../src/shared/sandbox/enable';
import { isSandboxError } from '../../../src/shared/sandbox/errors';

/** Path-like-named arguments that are NOT filesystem paths or URLs. */
const NOT_A_PATH: Record<string, string> = {
  'add_mate.output': 'transmission output part reference',
  'add_mate.path': 'transmission drive path (array of part references)',
  'add_surface.pull_dir': 'demoulding direction vector',
  'import_step.file_name': 'original upload name, used only for format detection',
  'import_step.upload.file_name': 'upload display name',
  'import_step.upload.file_id': 'opaque upload id',
  'send_to_printer.filename': 'name the file is uploaded under on the printer',
  'dfm_review.build_direction': 'axis name such as +z',
  'add_surface.kind': 'construction-path enum (description says "path")',
  'add_curve.kind': 'construction-path enum',
  'add_text.mode': 'authoring-path enum',
  'project_curve.commands': '2D path commands (geometry, not a filesystem path)',
  'fetch_part.model.sha256': 'digest for model.url (the URL itself is classified)',
};

const PATH_WORDS = new Set(['file', 'path', 'dir', 'directory', 'out', 'output', 'url', 'uri', 'font', 'fontfamily', 'environment', 'folder', 'dest', 'destination']);

function words(name: string): string[] {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split(/[_\-.]+/).filter(Boolean);
}

function looksLikePath(name: string, schema: Record<string, unknown>): boolean {
  if (words(name).some(w => PATH_WORDS.has(w))) return true;
  const d = String(schema.description ?? '');
  return /\bpath to\b|\{ ?file ?\}|\bfile ?path\b|https?:\/\/|\burl\b/i.test(d);
}

interface Found { tool: string; selector: string }

function walk(tool: string, prefix: string, schema: unknown, out: Found[]): void {
  if (schema === null || typeof schema !== 'object') return;
  const s = schema as Record<string, unknown>;
  for (const key of ['oneOf', 'anyOf', 'allOf']) for (const sub of (s[key] as unknown[] | undefined) ?? []) walk(tool, prefix, sub, out);
  for (const key of ['then', 'else', 'if']) if (s[key]) walk(tool, prefix, s[key], out);
  if (s.items) walk(tool, `${prefix}[]`, s.items, out);
  for (const [name, sub] of Object.entries((s.properties as Record<string, unknown>) ?? {})) {
    const selector = prefix === '' ? name : `${prefix}.${name}`;
    if (looksLikePath(name, (sub ?? {}) as Record<string, unknown>)) out.push({ tool, selector });
    walk(tool, selector, sub, out);
  }
}

function pathLikeArgs(): Found[] {
  const out: Found[] = [];
  for (const t of TOOLS) walk(t.name, '', t.inputSchema, out);
  // Dedupe (a property can be reached through several conditional branches).
  return [...new Map(out.map(f => [`${f.tool}:${f.selector}`, f])).values()];
}

function classified(tool: string, selector: string): boolean {
  const specs = MCP_SANDBOX_ARGS[tool] ?? [];
  // `a` is covered when a spec reaches into it (`a.file` for a { file } | { data } operand).
  return specs.some(([sel]) => sel === selector || sel.startsWith(`${selector}.`) || sel.startsWith(`${selector}[]`));
}

function inputFor(selector: string, value: string): Record<string, unknown> {
  const steps = selector.split('.');
  const build = (i: number): unknown => {
    if (i === steps.length) return value;
    const step = steps[i]!;
    const isArray = step.endsWith('[]');
    const child = build(i + 1);
    return { [isArray ? step.slice(0, -2) : step]: isArray ? [child] : child };
  };
  return build(0) as Record<string, unknown>;
}

const BAD: Record<SandboxArgKind, string[]> = {
  read: ['/etc/passwd', '../../outside/model.kcad.ts', '~/.ssh/id_rsa'],
  write: ['/etc/kernelcad-out.stl', '../escape/out.stl', 'link-out/out.stl'],
  url: ['https://example.com/part.step'],
  'path-or-url': ['https://example.com/photo.png', '/etc/passwd'],
  font: ['/usr/share/fonts/secret.ttf'],
  environment: ['https://example.com/studio.hdr'],
};
const GOOD: Record<SandboxArgKind, string> = {
  read: 'models/plate.kcad.ts', write: 'out/plate.stl', url: '', 'path-or-url': 'data:image/png;base64,AAAA',
  font: 'Liberation Sans', environment: 'studio',
};

describe('MCP sandbox audit — coverage', () => {
  it('every path- or URL-like tool argument is classified or explicitly exempted', () => {
    const missing = pathLikeArgs()
      .filter(f => !classified(f.tool, f.selector) && NOT_A_PATH[`${f.tool}.${f.selector}`] === undefined)
      .map(f => `${f.tool}.${f.selector}`);
    expect(missing, `Classify these in MCP_SANDBOX_ARGS (src/agent/mcp/sandboxArgs.ts) or exempt them here:\n${missing.join('\n')}`).toEqual([]);
  });

  it('the scan actually finds the known path arguments (heuristic sanity)', () => {
    const found = new Set(pathLikeArgs().map(f => `${f.tool}.${f.selector}`));
    for (const k of ['export.output_path', 'evaluate_script.file', 'design_loop.attempts[].file', 'mesh_boolean.a', 'render_preview.base_url']) {
      expect(found.has(k), k).toBe(true);
    }
  });

  it('every classified selector names a real argument of a registered tool', () => {
    const names = new Set(TOOLS.map(t => t.name));
    const all = new Set(pathLikeArgs().map(f => `${f.tool}.${f.selector}`));
    for (const [tool, specs] of Object.entries(MCP_SANDBOX_ARGS)) {
      expect(names.has(tool), tool).toBe(true);
      for (const [selector] of specs) {
        const head = selector.replace(/\.file$/, '');
        expect(all.has(`${tool}.${selector}`) || all.has(`${tool}.${head}`), `${tool}.${selector}`).toBe(true);
      }
    }
    for (const tool of Object.keys(MCP_SANDBOX_REFUSED_TOOLS)) expect(names.has(tool), tool).toBe(true);
  });
});

describe('MCP sandbox audit — enforcement through callMcpTool', () => {
  let base: string;
  let ws: string;
  let cwd: string;
  beforeAll(async () => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'kc-sbx-audit-')));
    ws = join(base, 'ws');
    mkdirSync(join(base, 'outside'), { recursive: true });
    mkdirSync(ws, { recursive: true });
    const { symlinkSync } = await import('node:fs');
    symlinkSync(join(base, 'outside'), join(ws, 'link-out'));
    cwd = process.cwd();
    process.chdir(ws);
    enableSandbox({ workspace: ws, env: { ...process.env }, installGuards: false });
  });
  afterAll(() => {
    disableSandboxForTest();
    process.chdir(cwd);
    rmSync(base, { recursive: true, force: true });
  });

  const cases = Object.entries(MCP_SANDBOX_ARGS)
    .filter(([tool]) => MCP_SANDBOX_REFUSED_TOOLS[tool] === undefined)
    .flatMap(([tool, specs]) => specs.flatMap(([selector, kind]) => BAD[kind].map(v => ({ tool, selector, kind, v }))));

  it.each(cases)('$tool $selector refuses $v', async ({ tool, selector, kind, v }) => {
    let err: unknown;
    try {
      await callMcpTool(tool, inputFor(selector, v));
    } catch (e) {
      err = e;
    }
    expect(isSandboxError(err), `${tool}.${selector}=${v} was not refused: ${String(err)}`).toBe(true);
    const code = (err as { code: string }).code;
    const isUrl = kind === 'url' || kind === 'environment' || (kind === 'path-or-url' && v.startsWith('http'));
    expect(code).toBe(isUrl ? 'cli.sandbox-network-denied' : 'cli.sandbox-path-denied');
    if (!isUrl) expect((err as Error).message).toContain(selector.replace(/\[\]/g, '[0]'));
  });

  it('workspace-relative values pass the argument guard', () => {
    for (const [tool, specs] of Object.entries(MCP_SANDBOX_ARGS)) {
      if (MCP_SANDBOX_REFUSED_TOOLS[tool] !== undefined) continue;
      for (const [selector, kind] of specs) {
        if (GOOD[kind] === '') continue;
        expect(() => guardMcpToolArgs(tool, inputFor(selector, GOOD[kind]))).not.toThrow();
      }
    }
  });

  it('wholly-online tools are refused outright', async () => {
    for (const tool of Object.keys(MCP_SANDBOX_REFUSED_TOOLS)) {
      await expect(callMcpTool(tool, {})).rejects.toMatchObject({ code: 'cli.sandbox-command-refused' });
    }
  });

  it('tools/list descriptions carry the sandbox constraint', () => {
    const exportDef = sandboxToolDefinition(TOOLS.find(t => t.name === 'export')!);
    expect(exportDef.description).toContain('SANDBOX MODE: path arguments (file, output_path, output_dir)');
    const fetchDef = sandboxToolDefinition(TOOLS.find(t => t.name === 'fetch_part')!);
    expect(fetchDef.description).toMatch(/network URLs in partsBaseUrl, model\.url are refused/);
    expect(sandboxToolDefinition(TOOLS.find(t => t.name === 'send_to_printer')!).description).toContain('unavailable in this session');
  });
});
