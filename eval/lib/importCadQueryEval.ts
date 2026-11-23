// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/lib/importCadQueryEval.ts
//
// Generates one eval task dir per upstream cadqueryeval task:
//   eval/tasks/cqe-taskNN/{prompt.md, harness.ts, reference.stl}
//
// Usage:
//   npx tsx eval/lib/importCadQueryEval.ts [--src ~/projects/cadqueryeval] [--out eval/tasks]
//
// Generated tasks other than the committed ones are scratch output: only the importer
// and the harness template live in the repo. Upstream YAMLs use multi-line
// double-quoted scalars that the npm `yaml` package rejects, so the few
// fields we need are extracted by line.

import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export interface CqeTaskSpec {
  id: string; // 'task14'
  n: number; // 14
  description: string;
  bbox: [number, number, number];
  components: number;
}

/** Extract `description:` as plain text from the raw YAML body. */
export function parseDescription(yaml: string): string {
  const lines = yaml.split('\n');
  const start = lines.findIndex((l) => l.startsWith('description:'));
  if (start < 0) throw new Error('no description: line');
  let end = lines.findIndex((l, i) => i > start && /^[a-z_]+:/.test(l));
  if (end < 0) end = lines.length;
  const first = lines[start].slice('description:'.length).replace(/\s+#.*$/, '');
  const rest = lines.slice(start + 1, end);
  const trimmedFirst = first.trim();
  if (trimmedFirst.startsWith('|')) {
    const indent = Math.min(...rest.filter((l) => l.trim() !== '').map((l) => l.match(/^ */)![0].length));
    return rest.map((l) => l.slice(indent)).join('\n').trim();
  }
  let body = [trimmedFirst, ...rest].join('\n').trim();
  if (body.startsWith('"') && body.endsWith('"')) body = body.slice(1, -1).replace(/\\"/g, '"');
  return body.replace(/[ \t]+\n/g, '\n').trim();
}

export function parseTask(yaml: string, id: string): CqeTaskSpec {
  const m = yaml.match(/bounding_box:\s*\[([^\]]+)\]/);
  if (!m) throw new Error(`${id}: no bounding_box`);
  const bbox = m[1].split(',').map((s) => Number(s.trim())) as [number, number, number];
  const c = yaml.match(/expected_component_count:\s*(\d+)/);
  return {
    id,
    n: Number(id.replace('task', '')),
    description: parseDescription(yaml),
    bbox,
    components: c ? Number(c[1]) : 1,
  };
}

export function renderPrompt(t: CqeTaskSpec): string {
  const nn = String(t.n).padStart(2, '0');
  return `# task${nn} (imported from cadqueryeval)

Build the following object as a kernelCAD \`.kcad.ts\` script returning a single Shape.

Use kernelCAD's primitives and boolean operations. Z-up, millimetres, degrees.

## Description

${t.description}

## Constraints

- Bounding box (X, Y, Z, mm): \`[${t.bbox.join(', ')}]\` — gated within ±2 mm or ±5% per axis (whichever is larger).
- Expected component count: ${t.components}.
`;
}

export function renderHarness(t: CqeTaskSpec, template: string): string {
  return template
    .replace(/const TARGET_BBOX: \[number, number, number\] = \[[^\]]*\];/, `const TARGET_BBOX: [number, number, number] = [${t.bbox.join(', ')}];`)
    .replace(/const EXPECTED_COMPONENTS = \d+;/, `const EXPECTED_COMPONENTS = ${t.components};`);
}

function main(): void {
  const args = process.argv.slice(2);
  const val = (f: string, d: string): string => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : d;
  };
  const src = resolve(val('--src', join(homedir(), 'projects/cadqueryeval')));
  const out = resolve(val('--out', 'eval/tasks'));
  const template = readFileSync(resolve("eval/tasks/cqe-task14/harness.ts"), "utf8");
  const dataDir = join(src, 'src/cadqueryeval/data');
  const files = readdirSync(join(dataDir, 'tasks')).filter((f) => /^task\d+\.yaml$/.test(f));
  for (const f of files) {
    const id = f.replace('.yaml', '');
    const spec = parseTask(readFileSync(join(dataDir, 'tasks', f), 'utf8'), id);
    const dir = join(out, `cqe-task${String(spec.n).padStart(2, '0')}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'prompt.md'), renderPrompt(spec));
    writeFileSync(join(dir, 'harness.ts'), renderHarness(spec, template));
    copyFileSync(join(dataDir, 'reference', `${id}.stl`), join(dir, 'reference.stl'));
  }
  console.log(`imported ${files.length} tasks into ${out}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
