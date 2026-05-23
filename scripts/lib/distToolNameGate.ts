// scripts/lib/distToolNameGate.ts
//
// For every backtick-quoted identifier in every shipped SKILL.md +
// README.md + harness/*.md inside the dist tree, check it resolves in
// the live TOOL_REGISTRY (MCP tools) or the CLI program (commander
// subcommands). Drift here means the agent will call a tool that no
// longer exists — silently-broken-agent failure mode.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TOOL_REGISTRY } from '../../src/agent/mcp/toolRegistry';

// CLI subcommands (kept in sync with src/agent/cli/index.ts).
const CLI_SUBCOMMANDS = new Set<string>([
  'evaluate',
  'export',
  'install',
  'interference',
  'mcp',
  'render',
  'skill',
  'validate',
]);

// Identifier-like patterns inside backticks. We only check patterns that
// look like a tool-or-command call:
//   `snake_case_name`              (MCP tool)
//   `kernelcad <subcommand> ...`   (CLI invocation)
//
// We deliberately ignore quoted strings that look like values (`M3`,
// `0.05`, hex colors, file paths, etc.) — they're identified by lack of
// an underscore AND lack of a `kernelcad ` prefix.
const MCP_REF = /`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g;
const CLI_REF = /`kernelcad\s+([a-z][a-z0-9-]*)/g;

export interface ToolNameHit {
  file: string;
  line: number;
  match: string;
}
export interface ToolNameResult {
  ok: boolean;
  hits: ToolNameHit[];
}

export function runToolNameGate({
  outDir,
  repoRoot: _repoRoot,
}: {
  outDir: string;
  repoRoot: string;
}): ToolNameResult {
  const mcpNames = new Set(TOOL_REGISTRY.map((e) => e.definition.name));
  const hits: ToolNameHit[] = [];
  walk(outDir, outDir, hits, mcpNames);
  return { ok: hits.length === 0, hits };
}

function walk(
  root: string,
  dir: string,
  out: ToolNameHit[],
  mcpNames: Set<string>,
): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(root, join(dir, entry.name), out, mcpNames);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.md$/i.test(entry.name)) continue;
    const abs = join(dir, entry.name);
    const src = readFileSync(abs, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // MCP tool references.
      let m: RegExpExecArray | null;
      MCP_REF.lastIndex = 0;
      while ((m = MCP_REF.exec(lines[i])) !== null) {
        if (!mcpNames.has(m[1])) {
          out.push({
            file: relative(root, abs).split(/[\\/]/).join('/'),
            line: i + 1,
            match: m[1],
          });
        }
      }
      // CLI subcommand references.
      CLI_REF.lastIndex = 0;
      while ((m = CLI_REF.exec(lines[i])) !== null) {
        if (!CLI_SUBCOMMANDS.has(m[1])) {
          out.push({
            file: relative(root, abs).split(/[\\/]/).join('/'),
            line: i + 1,
            match: `kernelcad ${m[1]}`,
          });
        }
      }
    }
  }
}
