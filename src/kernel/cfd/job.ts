// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/job.ts
//
// Makes a CFD run resumable and idempotent per input. A solve can outlast
// an MCP client's time limit; the hosted server answers "still running" and
// lets the client call again. For that re-call to JOIN the run instead of
// starting a second solver, the run directory is keyed by a hash of the
// generated case (every dictionary + the STL + the toolchain mode):
//
//   <dir>/cfd-result.json   finished result, returned as-is on a re-call;
//   <dir>/run.lock          { pid, host, startedAt } while a run is live;
//   <dir>/progress.json     the current stage, for a caller that polls.
//
// A re-call that finds a live lock waits for the result; a stale lock (dead
// pid, or older than the budget) is taken over.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';

export const RESULT_FILE = 'cfd-result.json';
export const SUMMARY_FILE = 'cfd-summary.json';
const LOCK_FILE = 'run.lock';
const PROGRESS_FILE = 'progress.json';

export function hashCase(files: Readonly<Record<string, string>>, extra: string): string {
  const h = createHash('sha256');
  for (const k of Object.keys(files).sort()) h.update(k).update('\0').update(files[k]).update('\0');
  h.update(extra);
  return h.digest('hex');
}

/** The stored result for this hash, if a finished one exists. */
export function readFinished<T extends { inputHash?: string }>(dir: string, hash: string): T | undefined {
  const p = join(dir, RESULT_FILE);
  if (!existsSync(p)) return undefined;
  try {
    const r = JSON.parse(readFileSync(p, 'utf8')) as T;
    return r.inputHash === hash ? r : undefined;
  } catch {
    return undefined;
  }
}

interface Lock { pid: number; host: string; startedAt: number; hash: string }

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function liveLock(dir: string, hash: string, maxAgeMs: number): Lock | undefined {
  const p = join(dir, LOCK_FILE);
  if (!existsSync(p)) return undefined;
  try {
    const l = JSON.parse(readFileSync(p, 'utf8')) as Lock;
    const fresh = Date.now() - l.startedAt < maxAgeMs;
    const owned = l.host !== hostname() || alive(l.pid);
    return l.hash === hash && fresh && owned && l.pid !== process.pid ? l : undefined;
  } catch {
    return undefined;
  }
}

export async function acquire(dir: string, hash: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  const lock: Lock = { pid: process.pid, host: hostname(), startedAt: Date.now(), hash };
  await writeFile(join(dir, LOCK_FILE), JSON.stringify(lock), 'utf8');
}

export async function release(dir: string): Promise<void> {
  await rm(join(dir, LOCK_FILE), { force: true });
}

export async function progress(dir: string, stage: string, detail?: Record<string, unknown>): Promise<void> {
  await writeFile(join(dir, PROGRESS_FILE), JSON.stringify({ stage, at: new Date().toISOString(), ...detail }), 'utf8').catch(() => undefined);
}

/**
 * If another live process is running this exact case, wait for its result
 * (polling) and return it; undefined when there is nothing to join.
 */
export async function joinRunning<T extends { inputHash?: string }>(
  dir: string,
  hash: string,
  maxAgeMs: number,
  pollMs = 2000,
): Promise<T | undefined> {
  while (liveLock(dir, hash, maxAgeMs) !== undefined) {
    await new Promise(r => setTimeout(r, pollMs));
    const done = readFinished<T>(dir, hash);
    if (done !== undefined) return done;
  }
  return readFinished<T>(dir, hash);
}
