// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox status — one structured report shared by `kernelcad sandbox status`,
// the MCP initialize `instructions` and serverInfo, so an agent learns the
// constraints before its first tool call.

import { getSandboxConfig } from './config';

export interface SandboxStatus {
  enabled: boolean;
  source?: string;
  workspaceRoot?: string;
  scratch?: { tmp: string; cache: string; config: string };
  readOnlyRoots?: readonly string[];
  network: {
    outbound: 'allowed' | 'refused';
    loopback: 'allowed' | 'refused';
  };
  telemetry: 'forced-off' | 'per-user-setting';
  diagnostics: readonly string[];
  docs: string;
}

export const SANDBOX_DOCS_URL = 'https://github.com/w1ne/kernelCAD-web/blob/develop/docs/sandbox.md';

export function sandboxStatus(): SandboxStatus {
  const cfg = getSandboxConfig();
  const diagnostics = ['cli.sandbox-path-denied', 'cli.sandbox-network-denied', 'cli.sandbox-command-refused'];
  if (cfg === null) {
    return {
      enabled: false,
      network: { outbound: 'allowed', loopback: 'allowed' },
      telemetry: 'per-user-setting',
      diagnostics,
      docs: SANDBOX_DOCS_URL,
    };
  }
  return {
    enabled: true,
    source: cfg.source,
    workspaceRoot: cfg.workspaceRoot,
    scratch: { tmp: cfg.scratch.tmp, cache: cfg.scratch.cache, config: cfg.scratch.config },
    readOnlyRoots: cfg.readOnlyRoots,
    network: { outbound: 'refused', loopback: cfg.allowLoopback ? 'allowed' : 'refused' },
    telemetry: 'forced-off',
    diagnostics,
    docs: SANDBOX_DOCS_URL,
  };
}

/** Plain-text constraints for an agent (MCP `instructions`). Empty string when off. */
export function sandboxAgentInstructions(): string {
  const s = sandboxStatus();
  if (!s.enabled) return '';
  return [
    'kernelCAD SANDBOX MODE is ON.',
    `- Files: every path you pass (file, output_path, out_dir, output_dir, frames_dir, ledgerPath, …) and every path a script reads (lib.fromSTEP/fromSTL, fonts, reference images) must resolve inside the workspace ${s.workspaceRoot}. Use workspace-relative paths. Paths that resolve outside it — absolute, \`..\`, \`~\`, or through a symlink — are refused with cli.sandbox-path-denied. Default temp/output dirs are created under ${s.scratch!.tmp}.`,
    `- Network: all outbound network is refused (cli.sandbox-network-denied)${s.network.loopback === 'allowed' ? ' except loopback (KERNELCAD_SANDBOX_ALLOW_LOOPBACK=1)' : ', loopback included'}. Do not call tools in network modes: import_step url/upload, fetch_part/find_part partsBaseUrl or model.url, send_to_printer, trace_from_image with an http(s) image, render_preview base_url, a URL environment, or the Studio selection tools. Use inline code, content_base64 / data inputs, files in the workspace, bundled HDRI presets and the local part catalog instead.`,
    '- Telemetry is forced off. Inline `code` inputs work as usual.',
    `- Details: ${s.docs}`,
  ].join('\n');
}
