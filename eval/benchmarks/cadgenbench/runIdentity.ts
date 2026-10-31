// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { delimiter, isAbsolute, join, resolve } from 'node:path';
import type { CadGenBenchTask } from './dataset';

function digestFile(path: string): string | null {
  return existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null;
}

/** Identify the invoked file. Scripts may depend on other files; this is not
 * a complete runtime dependency fingerprint. */
export function identifyCli(env: NodeJS.ProcessEnv, cwd: string): { path: string; sha256: string; script: boolean } {
  const local = resolve(cwd, 'dist/cli/index.js');
  const requested = env.KERNELCAD_BIN || (existsSync(local) ? local : 'kernelcad');
  const candidates = isAbsolute(requested) || requested.includes('/') || requested.includes('\\')
    ? [resolve(cwd, requested)]
    : (env.PATH ?? '').split(delimiter).map(p => resolve(cwd, p || '.', requested));
  const found = candidates.find(p => existsSync(p));
  if (!found) throw new Error(`Cannot identify kernelCAD CLI: ${requested}`);
  const path = realpathSync(found);
  const bytes = readFileSync(path);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex'), script: bytes.subarray(0, 2).toString() === '#!' || path.endsWith('.js') };
}

export function buildRunIdentity(tasks: CadGenBenchTask[], settings: Record<string, unknown>): string {
  const scripts = typeof settings.scriptsFrom === 'string' ? settings.scriptsFrom : undefined;
  const inputs = tasks.map((task) => ({
    id: task.id, type: task.type, description: task.description,
    images: task.images.map(digestFile),
    inputStep: task.inputStep ? digestFile(task.inputStep) : null,
    script: scripts ? digestFile(join(scripts, `${task.id}.kcad.ts`)) : null,
  }));
  return createHash('sha256').update(JSON.stringify({ version: 1, settings, inputs })).digest('hex');
}

export function assertRunIdentity(previous: unknown, current: string): void {
  if (previous !== current) {
    throw new Error('Run directory has missing or different input/configuration identity; choose a fresh --run-dir to avoid mixing results.');
  }
}
