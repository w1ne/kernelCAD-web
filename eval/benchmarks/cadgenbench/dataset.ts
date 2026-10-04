// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/dataset.ts
//
// CADGenBench public task inputs: download on demand, load, select.
//
// The inputs live in the Hugging Face dataset
// `HuggingAI4Engineering/cadgenbench-data` (ODC-BY 1.0). They are never
// committed here: `fetchDataset` mirrors one pinned revision into a gitignored
// cache (`eval/benchmarks/cadgenbench/.cache/<revision>/`) and records the
// revision, the license and the file sizes in `manifest.json`, so a rerun
// resumes a partial download and a run log can cite the exact revision.
//
// One directory per task:
//   generation: description.yaml + input.png (+ input2.png, ...)
//   editing:    description.yaml + edit_description.txt + input.step + renders/*.png

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export const DATA_REPO = 'HuggingAI4Engineering/cadgenbench-data';
export const DATA_LICENSE = 'ODC-BY-1.0';
const HF_BASE = 'https://huggingface.co';

export type TaskType = 'generation' | 'editing';

export interface CadGenBenchTask {
  id: string;
  type: TaskType;
  /** Absolute path of the task's input directory. */
  dir: string;
  /** The task prompt from description.yaml (the edit request for editing tasks). */
  description: string;
  /** Drawing images (generation) or renders of the starting solid (editing), absolute paths. */
  images: string[];
  /** Starting solid for editing tasks. */
  inputStep?: string;
}

export interface DatasetManifest {
  repo: string;
  revision: string;
  license: string;
  fetchedAt: string;
  files: Array<{ path: string; size: number }>;
}

export function defaultCacheDir(): string {
  return process.env.CADGENBENCH_CACHE ?? resolve('eval/benchmarks/cadgenbench/.cache');
}

interface TreeEntry {
  type: string;
  path: string;
  size: number;
}

async function getJson<T>(url: string, fetchImpl: typeof fetch): Promise<{ body: T; next?: string }> {
  const resp = await fetchImpl(url);
  if (!resp.ok) throw new Error(`GET ${url} → HTTP ${resp.status}`);
  const link = resp.headers.get('link') ?? '';
  const next = /<([^>]+)>;\s*rel="next"/.exec(link)?.[1];
  return { body: (await resp.json()) as T, ...(next ? { next } : {}) };
}

async function resolveRevision(repo: string, revision: string, fetchImpl: typeof fetch): Promise<string> {
  if (/^[0-9a-f]{40}$/.test(revision)) return revision;
  const { body } = await getJson<{ sha: string }>(`${HF_BASE}/api/datasets/${repo}/revision/${revision}`, fetchImpl);
  return body.sha;
}

async function listTree(repo: string, sha: string, fetchImpl: typeof fetch): Promise<TreeEntry[]> {
  const out: TreeEntry[] = [];
  let url: string | undefined = `${HF_BASE}/api/datasets/${repo}/tree/${sha}?recursive=true`;
  while (url) {
    const page: { body: TreeEntry[]; next?: string } = await getJson<TreeEntry[]>(url, fetchImpl);
    out.push(...page.body.filter((e) => e.type === 'file'));
    url = page.next;
  }
  return out;
}

/** Top-level task id of a dataset path (`101/input.png` → `101`), or null for repo-root files. */
export function taskIdOfPath(path: string): string | null {
  const slash = path.indexOf('/');
  return slash > 0 ? path.slice(0, slash) : null;
}

/** A task as seen in the remote file listing, before download. */
export interface RemoteTask {
  id: string;
  /** Editing tasks ship a starting solid; generation tasks ship drawings only. */
  type: TaskType;
}

/** Group a dataset file listing into tasks, in numeric id order. */
export function remoteTasks(paths: string[]): RemoteTask[] {
  const byId = new Map<string, TaskType>();
  for (const p of paths) {
    const id = taskIdOfPath(p);
    if (id === null) continue;
    if (!byId.has(id)) byId.set(id, 'generation');
    if (/\/input\.(step|stp)$/i.test(p)) byId.set(id, 'editing');
  }
  return [...byId.keys()].sort(numericFirst).map((id) => ({ id, type: byId.get(id)! }));
}

/** Pick task ids from the remote listing (same rules as {@link selectTasks}). */
export function pickTaskIds(tasks: RemoteTask[], sel: TaskSelection): string[] {
  return selectTasks(tasks, sel).map((t) => t.id);
}

export interface FetchDatasetOptions {
  cacheDir?: string;
  /** Branch, tag or commit. Default `main`, resolved to a commit sha before download. */
  revision?: string;
  /** Which tasks to download (repo-root helper files are always fetched). Default: all. */
  selection?: TaskSelection;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

/**
 * Mirror the public inputs into the cache and return the revision directory.
 * Files already present with the expected size are not downloaded again.
 */
export async function fetchDataset(opts: FetchDatasetOptions = {}): Promise<{ dir: string; manifest: DatasetManifest }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const log = opts.log ?? (() => {});
  const sha = await resolveRevision(DATA_REPO, opts.revision ?? 'main', fetchImpl);
  const dir = join(opts.cacheDir ?? defaultCacheDir(), sha);
  const tree = await listTree(DATA_REPO, sha, fetchImpl);
  const wanted = new Set(pickTaskIds(remoteTasks(tree.map((e) => e.path)), opts.selection ?? {}));
  const files = tree.filter((e) => {
    // Dot-files are repo plumbing; the mesh sidecar is a grader convenience
    // this harness does not read.
    if (e.path.startsWith('.') || e.path.endsWith('.mesh.npz')) return false;
    const id = taskIdOfPath(e.path);
    return id === null || wanted.has(id);
  });

  let downloaded = 0;
  for (const f of files) {
    const target = join(dir, f.path);
    if (existsSync(target) && statSync(target).size === f.size) continue;
    mkdirSync(dirname(target), { recursive: true });
    const url = `${HF_BASE}/datasets/${DATA_REPO}/resolve/${sha}/${f.path.split('/').map(encodeURIComponent).join('/')}`;
    const resp = await fetchImpl(url);
    if (!resp.ok) throw new Error(`GET ${url} → HTTP ${resp.status}`);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (bytes.length !== f.size) {
      throw new Error(`${f.path}: expected ${f.size} bytes, got ${bytes.length}`);
    }
    // Write-then-rename so an interrupted download never leaves a
    // right-named partial file behind.
    writeFileSync(`${target}.part`, bytes);
    renameSync(`${target}.part`, target);
    downloaded++;
  }
  log(`dataset ${DATA_REPO}@${sha.slice(0, 12)}: ${files.length} files, ${downloaded} downloaded → ${dir}`);

  const manifest: DatasetManifest = {
    repo: DATA_REPO,
    revision: sha,
    license: DATA_LICENSE,
    fetchedAt: new Date().toISOString(),
    files: files.map((f) => ({ path: f.path, size: f.size })),
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { dir, manifest };
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

function numericFirst(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

/** Load one task directory. Returns null when it has no description.yaml. */
export function loadTask(dir: string): CadGenBenchTask | null {
  const descPath = join(dir, 'description.yaml');
  if (!existsSync(descPath)) return null;
  const doc = (parseYaml(readFileSync(descPath, 'utf8')) ?? {}) as {
    description?: unknown;
    task_type?: unknown;
    input_files?: unknown;
  };
  const id = dir.replace(/\/+$/, '').split('/').pop()!;
  // The dataset card documents `task_type`, but generation tasks omit it;
  // the benchmark's own tooling defaults it to `generation` as well.
  const type: TaskType = doc.task_type === 'editing' ? 'editing' : 'generation';
  const declared = Array.isArray(doc.input_files) ? doc.input_files.map(String) : [];
  const editTxt = join(dir, 'edit_description.txt');
  const description =
    type === 'editing' && existsSync(editTxt)
      ? readFileSync(editTxt, 'utf8').trim()
      : String(doc.description ?? '').trim();

  if (type === 'generation') {
    const images = declared.filter((f) => IMAGE_EXT.test(f)).map((f) => join(dir, f));
    for (const img of images) {
      if (!existsSync(img)) throw new Error(`task ${id}: declared input ${img} is missing`);
    }
    return { id, type, dir, description, images };
  }

  const inputStep = join(dir, declared.find((f) => /\.(step|stp)$/i.test(f)) ?? 'input.step');
  if (!existsSync(inputStep)) throw new Error(`task ${id}: editing task without ${inputStep}`);
  const rendersDir = join(dir, 'renders');
  const images = existsSync(rendersDir)
    ? readdirSync(rendersDir).filter((f) => IMAGE_EXT.test(f)).sort().map((f) => join(rendersDir, f))
    : [];
  return { id, type, dir, description, images, inputStep };
}

/** Load every task under a dataset revision directory, in numeric id order. */
export function loadTasks(dataDir: string): CadGenBenchTask[] {
  return readdirSync(dataDir)
    .filter((name) => statSync(join(dataDir, name)).isDirectory())
    .sort(numericFirst)
    .map((name) => loadTask(join(dataDir, name)))
    .filter((t): t is CadGenBenchTask => t !== null);
}

export interface TaskSelection {
  /** Explicit ids; wins over the per-type sample counts. */
  ids?: string[];
  /** First N generation tasks (in id order). */
  generation?: number;
  /** First N editing tasks (in id order). */
  editing?: number;
}

/** Pick the tasks to run. With no selection, every task runs. */
export function selectTasks<T extends { id: string; type: TaskType }>(tasks: T[], sel: TaskSelection): T[] {
  if (sel.ids && sel.ids.length > 0) {
    const known = new Set(tasks.map((t) => t.id));
    const unknown = sel.ids.filter((id) => !known.has(id));
    if (unknown.length > 0) throw new Error(`unknown task id(s): ${unknown.join(', ')}`);
    const wanted = new Set(sel.ids);
    return tasks.filter((t) => wanted.has(t.id));
  }
  if (sel.generation === undefined && sel.editing === undefined) return tasks;
  return [
    ...tasks.filter((t) => t.type === 'generation').slice(0, sel.generation ?? 0),
    ...tasks.filter((t) => t.type === 'editing').slice(0, sel.editing ?? 0),
  ];
}
