// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/toolchain.ts
//
// Finds an OpenFOAM install and runs its utilities, reporting absence as
// ACTIONABLE data (`cfd.solver.unavailable` + the install command), never
// as an ENOENT crash. OpenFOAM is GPL and is not bundled: kernelCAD shells
// out to whatever the host provides.
//
// Discovery order:
//   1. KERNELCAD_OPENFOAM = a wrapper (`/usr/bin/openfoam2406`), 'native'
//      (utilities already on PATH), or 'docker' (force the image route);
//   2. utilities on PATH (`simpleFoam` from a sourced environment);
//   3. an `openfoamNNNN` / `openfoam` session wrapper on PATH (apt packages);
//   4. a LOCAL Docker image: KERNELCAD_OPENFOAM_IMAGE or one of the
//      opencfd images. Never pulled implicitly: a 250 MB download is the
//      user's decision, so the hint names the command instead.
//
// Every solver process gets a hard wall-clock limit, and the Docker route
// runs with `--network none`: a solver needs no network, which also keeps
// sandbox mode's no-outbound promise for the containerised child.

import { spawn } from 'node:child_process';

export const DEFAULT_OPENFOAM_IMAGES = ['opencfd/openfoam-run:2406', 'opencfd/openfoam-default:2406', 'opencfd/openfoam-run:2412'];
const WRAPPERS = ['openfoam2412', 'openfoam2406', 'openfoam2312', 'openfoam'];

export const CFD_INSTALL_HINT =
  'Install OpenFOAM (ESI, v2312 or newer) natively — Ubuntu/Debian: add the repository with ' +
  '`curl -s https://dl.openfoam.com/add-debian-repo.sh | sudo bash` then `sudo apt-get install -y openfoam2406-default` — ' +
  'or pull the slim container image `docker pull opencfd/openfoam-run:2406` (about 250 MB download, 1 GB on disk). ' +
  'Point kernelCAD at a specific install with KERNELCAD_OPENFOAM=/usr/bin/openfoam2406 or KERNELCAD_OPENFOAM_IMAGE=<image>.';

export interface CfdToolchain {
  ok: boolean;
  mode?: 'native' | 'docker';
  /** Native session wrapper (`openfoam2406`), when the PATH has no utilities. */
  wrapper?: string;
  image?: string;
  version?: string;
  missing: readonly string[];
  hint?: string;
}

export interface RunResult { code: number; out: string; timedOut: boolean }

/** Spawn with a hard wall-clock limit; output captured (tail-capped). */
export function runBounded(cmd: string, args: string[], opts: { cwd?: string; timeoutMs: number }): Promise<RunResult> {
  return new Promise(resolve => {
    let child;
    try {
      child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: -1, out: String(e), timedOut: false });
      return;
    }
    let out = '';
    let timedOut = false;
    const keep = (d: unknown): void => { out = (out + String(d)).slice(-200_000); };
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, opts.timeoutMs);
    child.stdout?.on('data', keep);
    child.stderr?.on('data', keep);
    child.on('error', e => { clearTimeout(timer); resolve({ code: -1, out: out + String(e), timedOut }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code: code ?? -1, out, timedOut }); });
  });
}

const versionOf = (out: string): string | undefined => /\b(v?\d{4})\b/.exec(out)?.[1];

async function probeNative(): Promise<CfdToolchain | undefined> {
  const onPath = await runBounded('simpleFoam', ['-help'], { timeoutMs: 20_000 });
  if (onPath.code === 0) return { ok: true, mode: 'native', missing: [], ...(versionOf(process.env.WM_PROJECT_VERSION ?? '') ? { version: process.env.WM_PROJECT_VERSION } : {}) };
  for (const w of WRAPPERS) {
    const r = await runBounded(w, ['-c', 'simpleFoam -help >/dev/null && echo "$WM_PROJECT_VERSION"'], { timeoutMs: 30_000 });
    if (r.code === 0) {
      const v = r.out.trim().split('\n').pop();
      return { ok: true, mode: 'native', wrapper: w, missing: [], ...(v ? { version: v } : {}) };
    }
  }
  return undefined;
}

async function probeDocker(): Promise<CfdToolchain | undefined> {
  const images = process.env.KERNELCAD_OPENFOAM_IMAGE ? [process.env.KERNELCAD_OPENFOAM_IMAGE] : DEFAULT_OPENFOAM_IMAGES;
  for (const image of images) {
    const r = await runBounded('docker', ['image', 'inspect', '--format', '{{.Id}}', image], { timeoutMs: 20_000 });
    if (r.code === 0) return { ok: true, mode: 'docker', image, missing: [], ...(versionOf(image) ? { version: versionOf(image) } : {}) };
  }
  return undefined;
}

/**
 * Probe for OpenFOAM. Not cached: an agent that installs OpenFOAM
 * mid-session must see it appear.
 */
export async function detectCfdToolchain(): Promise<CfdToolchain> {
  const forced = process.env.KERNELCAD_OPENFOAM;
  if (forced !== undefined && forced !== '' && forced !== 'native' && forced !== 'docker') {
    const r = await runBounded(forced, ['-c', 'simpleFoam -help >/dev/null && echo "$WM_PROJECT_VERSION"'], { timeoutMs: 30_000 });
    if (r.code === 0) return { ok: true, mode: 'native', wrapper: forced, missing: [], version: r.out.trim().split('\n').pop() };
  } else {
    const found = (forced === 'docker' ? undefined : await probeNative()) ?? (forced === 'native' ? undefined : await probeDocker());
    if (found !== undefined) return found;
  }
  return { ok: false, missing: ['OpenFOAM (simpleFoam, snappyHexMesh)'], hint: CFD_INSTALL_HINT };
}

/** Same contract as the FEA toolchain flag: CI that installed OpenFOAM sets
 *  KERNELCAD_REQUIRE_CFD_TOOLCHAIN=1 so a broken install fails loudly. */
export function requireCfdToolchainIfDemanded(tc: CfdToolchain): void {
  if (tc.ok || process.env.KERNELCAD_REQUIRE_CFD_TOOLCHAIN !== '1') return;
  throw new Error(`KERNELCAD_REQUIRE_CFD_TOOLCHAIN=1 but OpenFOAM is unavailable. ${tc.hint ?? ''}`);
}

/**
 * Run one shell command line inside the case directory with the OpenFOAM
 * environment loaded. Output goes to the command's own log file (the
 * command line redirects it); the captured stream is the wrapper's.
 */
export async function runFoam(tc: CfdToolchain, caseDir: string, command: string, timeoutMs: number, cores = 1): Promise<RunResult> {
  if (tc.mode === 'docker' && tc.image !== undefined) {
    // Killing the docker CLI does not stop the container: name it and kill
    // it by name when the wall-clock limit fires.
    const name = `kernelcad-cfd-${process.pid}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const user = typeof process.getuid === 'function' && process.getuid() !== 0 ? ['--user', `${process.getuid()}:${process.getgid?.() ?? 0}`] : [];
    const r = await runBounded('docker', [
      'run', '--rm', '--name', name, '--network', 'none', ...user,
      '--cpus', String(Math.max(1, cores)),
      '-e', 'OMPI_ALLOW_RUN_AS_ROOT=1', '-e', 'OMPI_ALLOW_RUN_AS_ROOT_CONFIRM=1',
      '-v', `${caseDir}:/case`, '-w', '/case',
      tc.image, '-c', `cd /case && ${command}`,
    ], { timeoutMs });
    if (r.timedOut) await runBounded('docker', ['kill', name], { timeoutMs: 20_000 });
    return r;
  }
  if (tc.wrapper !== undefined) return runBounded(tc.wrapper, ['-c', command], { cwd: caseDir, timeoutMs });
  return runBounded('bash', ['-c', command], { cwd: caseDir, timeoutMs });
}
