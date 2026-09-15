// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/toolchain.ts
//
// Locates the two external programs the FEA path needs and reports their
// absence as ACTIONABLE data rather than a crash: an agent that gets
// `fea.solver.unavailable` with the exact install command can fix its own
// environment; an agent that gets ENOENT from a spawn cannot.
//
// Neither tool is bundled. CalculiX (`ccx`, GPL) and gmsh (GPL) are separate
// programs with their own licences; kernelCAD shells out to whatever the host
// has installed and never vendors either binary.
//
// Discovery order is explicit-env → PATH → the repo-local venv, so a
// developer can point at a custom build without editing code.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Candidate names Debian/Ubuntu, Fedora, and upstream builds use. */
const CCX_NAMES = ['ccx', 'ccx_2.22', 'ccx_2.21', 'ccx_2.20', 'CalculiX'];

export interface FeaToolchain {
  /** Executable that runs CalculiX, or undefined when none was found. */
  ccx?: string;
  /** Python interpreter that can `import gmsh`, or undefined. */
  python?: string;
  /** Reported gmsh version, when probing succeeded. */
  gmshVersion?: string;
  ok: boolean;
  /** Human/agent-facing reason + install command when `ok` is false. */
  missing: readonly string[];
  hint?: string;
}

export const FEA_INSTALL_HINT =
  'Install the solver toolchain: `sudo apt-get install -y calculix-ccx` (or `dnf install calculix`), ' +
  'and a Python with gmsh: `python3 -m venv .fea-venv && .fea-venv/bin/pip install gmsh==4.15.2`. ' +
  'Point kernelCAD at them with KERNELCAD_CCX=/path/to/ccx and KERNELCAD_FEA_PYTHON=/path/to/python. ' +
  'No container needed; a Docker fallback is documented in the kernelcad-fea skill.';

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ code: number; out: string }> {
  return new Promise(resolve => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      resolve({ code: -1, out: '' });
      return;
    }
    let out = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout?.on('data', d => { out += String(d); });
    child.stderr?.on('data', d => { out += String(d); });
    child.on('error', () => { clearTimeout(timer); resolve({ code: -1, out }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code: code ?? -1, out }); });
  });
}

/** Python interpreters to try, in order: explicit env, a project venv found by
 *  walking up from `cwd`, then PATH. The upward walk matters because tools are
 *  frequently invoked with a cwd inside the project (a script's own directory),
 *  and a venv one level up is still this project's venv. */
function pythonCandidates(cwd: string): string[] {
  const out: string[] = [];
  if (process.env.KERNELCAD_FEA_PYTHON) out.push(process.env.KERNELCAD_FEA_PYTHON);
  let dir = cwd;
  for (let up = 0; up < 5; up++) {
    for (const venv of ['.fea-venv', '.venv', 'venv']) {
      const p = join(dir, venv, 'bin', 'python');
      if (existsSync(p)) out.push(p);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  out.push('python3', 'python');
  return out;
}

/**
 * Probe for `ccx` and a gmsh-capable Python. Cheap enough to call per run
 * (two short spawns) and deliberately NOT cached across process lifetime —
 * an agent that installs the toolchain mid-session must see it appear.
 */
export async function detectFeaToolchain(cwd: string = process.cwd()): Promise<FeaToolchain> {
  let ccx: string | undefined;
  const ccxNames = process.env.KERNELCAD_CCX ? [process.env.KERNELCAD_CCX, ...CCX_NAMES] : CCX_NAMES;
  for (const name of ccxNames) {
    // `ccx -v` prints the version and exits non-zero on some builds; a
    // successful spawn (code !== -1) is the signal, not the exit code.
    const r = await run(name, ['-v'], 10_000);
    if (r.code !== -1) { ccx = name; break; }
  }

  let python: string | undefined;
  let gmshVersion: string | undefined;
  for (const cand of pythonCandidates(cwd)) {
    const r = await run(cand, ['-c', 'import gmsh; print(gmsh.GMSH_API_VERSION)'], 30_000);
    if (r.code === 0) {
      python = cand;
      gmshVersion = r.out.trim().split('\n').pop();
      break;
    }
  }

  const missing: string[] = [];
  if (ccx === undefined) missing.push('CalculiX (ccx)');
  if (python === undefined) missing.push('gmsh (python module)');
  return {
    ...(ccx !== undefined ? { ccx } : {}),
    ...(python !== undefined ? { python } : {}),
    ...(gmshVersion !== undefined ? { gmshVersion } : {}),
    ok: missing.length === 0,
    missing,
    ...(missing.length > 0 ? { hint: FEA_INSTALL_HINT } : {}),
  };
}

/** Spawn a child, capture output, and enforce a hard wall-clock limit.
 *  Every external call in the FEA path goes through here so no solver run can
 *  wedge an agent session. */
export async function runBounded(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number },
): Promise<{ code: number; out: string; timedOut: boolean }> {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, opts.timeoutMs);
    child.stdout?.on('data', d => { out += String(d); });
    child.stderr?.on('data', d => { out += String(d); });
    child.on('error', e => { clearTimeout(timer); resolve({ code: -1, out: out + String(e), timedOut }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code: code ?? -1, out, timedOut }); });
  });
}
