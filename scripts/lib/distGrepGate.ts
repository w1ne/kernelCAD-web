// scripts/lib/distGrepGate.ts
//
// Greps every shipped path in a dist tree against the comparator
// blocklist. Case-insensitive. Returns a structured result so the
// orchestrator can format and exit. The blocklist is the union of
// every comparator that has shown up across the parity workstream;
// adding to it is a one-line edit here.
//
// Some entries (replicad, gazebo) double as legitimate technical
// references (kernel dependency name; SDF-Gazebo format token). The
// gate distinguishes by precise pattern so that `replicad.drawText`
// (API usage) and `sdf-gazebo` (format slot) do NOT trip the gate,
// while comparator-prose like "Inspired by replicad" or "Like
// Gazebo" does.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

interface BlocklistEntry {
  pattern: RegExp;
  // Human label for the match (what shows up in `hit.match`).
  label: string;
}

const BLOCKLIST: ReadonlyArray<BlocklistEntry> = [
  { pattern: /cadskills/i, label: 'cadskills' },
  { pattern: /build123d/i, label: 'build123d' },
  { pattern: /cadquery/i, label: 'cadquery' },
  // replicad is also the kernel-dependency name. Allow technical refs:
  //   `replicad.identifier`         (API call)
  //   `replicad-something`          (compound name like replicad-opencascadejs, replicad-drawn)
  //   `replicad's`                  (possessive technical reference)
  //   `replicad <technical-noun>`   (replicad wrapper, replicad pen, replicad-drawn edge)
  // Flag comparator-prose: `replicad` followed by sentence punctuation,
  // end-of-line, or comparator phrasing.
  {
    pattern: /\breplicad\b(?!\.[A-Za-z_]|[-']|\s+(?:wrapper|pen|drawn|library|api|module|package|backend|kernel))/i,
    label: 'replicad',
  },
  { pattern: /forgecad/i, label: 'forgecad' },
  { pattern: /\bonshape\b/i, label: 'onshape' },
  { pattern: /fusion\s*360/i, label: 'fusion 360' },
  { pattern: /\bfusion360\b/i, label: 'fusion360' },
  { pattern: /\bmoveit\b/i, label: 'moveit' },
  // gazebo is also part of the `sdf-gazebo` format token and used as
  // the name of the robotics ecosystem we export TO (`Gazebo SDFormat`,
  // `Gazebo SDF`). Flag comparator-prose but allow:
  //   `sdf-gazebo`               (format slot identifier)
  //   `Gazebo SDFormat`          (ecosystem format name)
  //   `Gazebo SDF`               (ecosystem format name)
  {
    pattern: /(?<!sdf-)\bgazebo\b(?!\s+SDF(?:ormat)?)/i,
    label: 'gazebo',
  },
  { pattern: /sendcutsend/i, label: 'sendcutsend' },
  { pattern: /step\.parts/i, label: 'step.parts' },
  { pattern: /earthtojake/i, label: 'earthtojake' },
  // skills.sh is banned as a comparator-prose reference, NOT the CLI.
  { pattern: /\bskills\.sh\b/i, label: 'skills.sh' },
];

const SKIP_FILES = new Set<string>([
  'LICENSE', // legal text — not subject to the comparator gate
]);
const SKIP_DIRS = new Set<string>(['.git', 'node_modules']);
const SCAN_EXT = /\.(md|json|mjs|js|ts|toml|yaml|yml|txt)$/i;

export interface GrepHit {
  file: string;
  line: number;
  match: string;
}
export interface GrepResult {
  ok: boolean;
  hits: GrepHit[];
}

export function runGrepGate(root: string): GrepResult {
  const hits: GrepHit[] = [];
  walk(root, root, hits);
  return { ok: hits.length === 0, hits };
}

function walk(root: string, dir: string, out: GrepHit[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(root, join(dir, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_FILES.has(entry.name)) continue;
    if (!SCAN_EXT.test(entry.name)) continue;
    const abs = join(dir, entry.name);
    const src = readFileSync(abs, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const block of BLOCKLIST) {
        if (block.pattern.test(lines[i])) {
          out.push({
            file: relative(root, abs).split(/[\\/]/).join('/'),
            line: i + 1,
            match: block.label,
          });
        }
      }
    }
  }
}
