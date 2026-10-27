// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CadGenBenchTask } from './dataset';

function digestFile(path: string): string | null {
  return existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null;
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
