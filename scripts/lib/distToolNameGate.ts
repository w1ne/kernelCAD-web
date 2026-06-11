// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
  'animate',
  'dfm',
  'evaluate',
  'export',
  'inspect',
  'install',
  'interference',
  'mcp',
  'parts',
  'render',
  'skill',
  'stats',
  'telemetry',
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
//
// Some snake_case identifiers appear legitimately in CAD prose: mate
// type values (`pin_slot`, `pin_slot`-like constraint names), example
// variable identifiers (`new_code`, `old_code`), parameter token names
// (`scale_mode`), etc. Allowlist them so the gate stays focused on
// drifted/renamed tool references.
const MCP_REF = /`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g;
const CLI_REF = /`kernelcad\s+([a-z][a-z0-9-]*)/g;

// Known non-tool snake_case identifiers — values, parameter names,
// example variable identifiers that legitimately appear in CAD prose
// and would otherwise be flagged by the MCP-ref regex.
const NON_TOOL_ALLOWLIST = new Set<string>([
  // Mate type values (assembly mate type enumeration).
  'pin_slot',
  // Example-variable identifiers used in code prose.
  'new_code',
  'old_code',
  // Common parameter names used in MCP tool signatures (documented
  // alongside tool names, not tool calls themselves).
  'feature_id',
  'feature_count',
  'output_path',
  'byte_count',
  'binding_name',
  'curve_bindings',
  'chain_anchor',
  'spine_binding',
  'profile_binding',
  'section_sketch_ids',
  // Sketch / scale modes.
  'scale_mode',
  'snake_case', // appears literally in prose about naming convention
  // Common type-like tokens.
  'shape_info',
  // Kinematic-tool parameter names (documented alongside the real tool
  // names check_swept_collision / check_reachable / check_load_capacity,
  // which DO resolve in the registry — these are their params, not calls).
  'collision_tolerance_mm3',
  'tip_link',
  'target_position',
  'target_orientation',
  'prefer_solver',
  'max_iterations',
  'safety_factor_threshold',
  // Referenced in sdformat prose only to state it does NOT exist as a tool
  // ("There is no separate `validate_sdf` MCP tool") — not a tool call.
  'validate_sdf',
  // capture_animation tool parameters / envelope fields (documented
  // alongside the real capture_animation tool name, which DOES resolve —
  // these are its params/result fields, not tool calls).
  'frames_dir',
  'verify_every',
  'verify_skipped',
  'failure_kind',
]);

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
}: {
  outDir: string;
  /** Reserved for future use (e.g., loading TOOL_REGISTRY from a snapshot file rather than in-process). */
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
        if (!mcpNames.has(m[1]) && !NON_TOOL_ALLOWLIST.has(m[1])) {
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
