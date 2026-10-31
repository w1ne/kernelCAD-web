// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox guard for MCP tool ARGUMENTS.
//
// `callMcpTool` runs `guardMcpToolArgs` before every local handler. The table
// below classifies every path- or URL-taking argument of every registered
// tool; each string it selects is judged by the shared path decision
// (`checkSandboxPath`, src/shared/sandbox/pathGuard.ts) or the shared network
// policy (`networkAllowed`). A refusal is a structured KernelError
// (`cli.sandbox-path-denied` / `cli.sandbox-network-denied` /
// `cli.sandbox-command-refused`) raised before the handler starts, so the
// agent learns which argument to change.
//
// The node:fs + network chokepoints still back this up for paths a tool
// derives itself (default temp dirs, sibling ledgers, paths read by a script).
//
// tests/unit/mcp/sandboxToolAudit.test.ts enumerates TOOLS and fails when a
// path-like argument is not classified here (or explicitly exempted there).

import { checkSandboxPath, shortRefusal } from '../../shared/sandbox/pathGuard';
import { getSandboxConfig, type SandboxConfig } from '../../shared/sandbox/config';
import { networkAllowed } from '../../shared/sandbox/networkGuard';
import { sandboxCommandRefused, sandboxNetworkError, sandboxPathArgError } from '../../shared/sandbox/errors';
import type { McpToolDefinition } from './registry/types';

/**
 * - `read` / `write`: a filesystem path (write = must be inside the workspace,
 *   read-only runtime roots don't count).
 * - `url`: a network endpoint — refused unless the loopback policy admits it.
 * - `path-or-url`: http(s) → url; data: → inline (allowed); anything else → read path.
 * - `font`: a logical font name, or a .ttf/.otf path → read path.
 * - `environment`: an HDRI preset / 'none' / server-relative name, or a URL → url.
 */
export type SandboxArgKind = 'read' | 'write' | 'url' | 'path-or-url' | 'font' | 'environment';

/** Argument selector: dotted path; `[]` steps into array items. */
export type SandboxArgSpec = readonly [selector: string, kind: SandboxArgKind];

export const MCP_SANDBOX_ARGS: Readonly<Record<string, readonly SandboxArgSpec[]>> = {
  evaluate_script: [['file', 'read']],
  diff_scripts: [['baseFile', 'read'], ['file', 'read']],
  inspect: [['file', 'read']],
  verify: [['file', 'read'], ['urdf_path', 'read']],
  why_did_this_fail: [['file', 'read']],
  trace_from_image: [['imageUrl', 'path-or-url']],
  add_text: [['font', 'font'], ['fontFamily', 'font']],
  query: [['file', 'read']],
  export: [['file', 'read'], ['output_path', 'write'], ['output_dir', 'write']],
  find_part: [['partsBaseUrl', 'url']],
  fetch_part: [['partsBaseUrl', 'url'], ['model.url', 'url']],
  review_cad: [['file', 'read']],
  design_loop: [
    ['attempts[].file', 'read'],
    ['attempts[].visualReview.screenshotPath', 'read'],
    ['attempts[].visualReview.checks[].screenshotPath', 'read'],
    ['outputRecordPath', 'write'],
  ],
  flatten_pattern: [['file', 'read']],
  evaluate_sdf: [['file', 'read']],
  capture_animation: [['file', 'read'], ['output_path', 'write'], ['frames_dir', 'write'], ['environment', 'environment']],
  render_preview: [['file', 'read'], ['out_dir', 'write'], ['environment', 'environment'], ['base_url', 'url']],
  resolve_assumptions: [['ledgerPath', 'write']],
  run_fea: [['file', 'read'], ['output_dir', 'write']],
  fea_summary: [['output_dir', 'read']],
  send_to_printer: [['gcode_path', 'read'], ['model_3mf_path', 'read']],
  repair_script: [['file', 'read']],
  sweep_tolerance: [['file', 'read']],
  diff_geometry: [['baseFile', 'read'], ['file', 'read'], ['out_dir', 'write']],
  drawing_to_cad: [['path', 'read'], ['out', 'write']],
  mesh_to_features: [['file', 'read'], ['out', 'write']],
  get_selection: [['studio_url', 'url']],
  set_selection: [['studio_url', 'url']],
  ray_pick: [['file', 'read'], ['studio_url', 'url']],
  import_step: [['url', 'url'], ['upload.download_url', 'url'], ['output_dir', 'write']],
  dfm_review: [['file', 'read']],
  inspect_nurbs: [['file', 'read']],
  mesh_boolean: [['a.file', 'read'], ['b.file', 'read']],
};

/** Tools whose every mode needs the network: refused outright in sandbox mode. */
export const MCP_SANDBOX_REFUSED_TOOLS: Readonly<Record<string, string>> = {
  send_to_printer: 'it uploads G-code to a network printer (OctoPrint / Moonraker / Bambu LAN)',
};

/** Every string value the selector reaches inside `input`, with its concrete path. */
export function selectArgValues(input: unknown, selector: string): Array<{ path: string; value: string }> {
  const steps = selector.split('.');
  let frontier: Array<{ path: string; value: unknown }> = [{ path: '', value: input }];
  for (const step of steps) {
    const isArray = step.endsWith('[]');
    const key = isArray ? step.slice(0, -2) : step;
    const next: Array<{ path: string; value: unknown }> = [];
    for (const { path, value } of frontier) {
      if (value === null || typeof value !== 'object') continue;
      const child = (value as Record<string, unknown>)[key];
      const childPath = path === '' ? key : `${path}.${key}`;
      if (!isArray) next.push({ path: childPath, value: child });
      else if (Array.isArray(child)) child.forEach((v, i) => next.push({ path: `${childPath}[${i}]`, value: v }));
    }
    frontier = next;
  }
  return frontier.filter((f): f is { path: string; value: string } => typeof f.value === 'string' && f.value !== '');
}

const URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return '?';
  }
}

/** Reduce a typed argument to the check it needs: a path access, a URL, or nothing. */
function classify(kind: SandboxArgKind, value: string): { path?: 'read' | 'write'; url?: boolean } {
  switch (kind) {
    case 'read':
    case 'write':
      return { path: kind };
    case 'url':
      return { url: true };
    case 'path-or-url':
      if (value.startsWith('data:')) return {};
      if (value.startsWith('file:')) return { path: 'read' };
      return URL_RE.test(value) ? { url: true } : { path: 'read' };
    case 'font':
      return /[/\\]|\.(ttf|otf)$/i.test(value) ? { path: 'read' } : {};
    case 'environment':
      return URL_RE.test(value) && !value.startsWith('file:') ? { url: true } : {};
  }
}

function checkOne(tool: string, argPath: string, kind: SandboxArgKind, value: string, cfg: SandboxConfig): void {
  const need = classify(kind, value);
  if (need.url && !networkAllowed(hostOf(value))) {
    throw sandboxNetworkError(`${tool} argument ${argPath}`, value);
  }
  if (need.path === undefined) return;
  const verdict = checkSandboxPath(value, need.path, cfg);
  if (verdict.allowed) return;
  throw sandboxPathArgError({
    api: tool,
    arg: argPath,
    got: value,
    detail: shortRefusal(verdict),
    workspaceRoot: cfg.workspaceRoot,
  });
}

/**
 * Throw a sandbox KernelError if any path/URL argument of `tool` breaks the
 * sandbox. No-op when sandbox mode is off.
 */
export function guardMcpToolArgs(tool: string, input: Record<string, unknown>): void {
  const cfg = getSandboxConfig();
  if (cfg === null) return;
  const refused = MCP_SANDBOX_REFUSED_TOOLS[tool];
  if (refused !== undefined) throw sandboxCommandRefused(`MCP tool ${tool}`, refused);
  for (const [selector, kind] of MCP_SANDBOX_ARGS[tool] ?? []) {
    for (const { path, value } of selectArgValues(input, selector)) checkOne(tool, path, kind, value, cfg);
  }
}

/** Append the sandbox constraint to the description of tools it affects (tools/list in sandbox mode). */
export function sandboxToolDefinition(def: McpToolDefinition): McpToolDefinition {
  if (getSandboxConfig() === null) return def;
  const refused = MCP_SANDBOX_REFUSED_TOOLS[def.name];
  if (refused !== undefined) {
    return { ...def, description: `${def.description}\n\nSANDBOX MODE: unavailable in this session — ${refused}.` };
  }
  const specs = MCP_SANDBOX_ARGS[def.name] ?? [];
  const urls = specs.filter(([, k]) => k === 'url' || k === 'environment' || k === 'path-or-url').map(([s]) => s);
  const paths = specs.filter(([, k]) => k !== 'url').map(([s]) => s);
  const notes: string[] = [];
  if (paths.length > 0) notes.push(`path arguments (${paths.join(', ')}) must resolve inside the workspace`);
  if (urls.length > 0) notes.push(`network URLs in ${urls.join(', ')} are refused`);
  if (notes.length === 0) return def;
  return { ...def, description: `${def.description}\n\nSANDBOX MODE: ${notes.join('; ')}.` };
}
