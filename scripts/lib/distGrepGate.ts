// scripts/lib/distGrepGate.ts
//
// Greps every shipped path in a dist tree against the comparator
// blocklist. Case-insensitive. Returns a structured result so the
// orchestrator can format and exit. The blocklist is the union of
// every comparator that has shown up across the parity workstream;
// adding to it is a one-line edit here.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const BLOCKLIST: ReadonlyArray<string> = [
  'cadskills',
  'build123d',
  'cadquery',
  'replicad',
  'forgecad',
  'onshape',
  'fusion 360',
  'fusion360',
  'moveit',
  'gazebo',
  'sendcutsend',
  'step.parts',
  'earthtojake',
  'skills.sh', // banned as a comparator-prose reference, NOT the CLI command
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
      const lower = lines[i].toLowerCase();
      for (const word of BLOCKLIST) {
        if (lower.includes(word)) {
          out.push({
            file: relative(root, abs).split(/[\\/]/).join('/'),
            line: i + 1,
            match: word,
          });
        }
      }
    }
  }
}
