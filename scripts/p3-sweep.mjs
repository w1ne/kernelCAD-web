#!/usr/bin/env node
// P3 sweep: run `validate --include-interference --json` against every
// `examples/**/*.kcad.ts` and emit a compact per-file outcome line. The
// output drives the PR sweep report.
//
// Outcome categories:
//   OK         — `ok: true` and `mechanism === 'real'` (or 'unverified' when
//                no mates).
//   BROKEN     — `mechanism === 'broken'` with one or more failures.
//   UNVERIFIED — physical assembly with mates that hit a probe error.
//   ERROR      — the CLI exited non-zero in a way we couldn't classify
//                (eval failure, kernel crash, etc.). Surfaced verbatim.

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CLI = join(ROOT, 'dist/cli/index.js');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith('.kcad.ts')) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(join(ROOT, 'examples')).sort();

for (const file of files) {
  const rel = relative(ROOT, file);
  let stdout = '';
  let exitCode = 0;
  try {
    stdout = execFileSync('node', [CLI, 'validate', '--include-interference', '--json', rel], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    });
  } catch (err) {
    stdout = err.stdout?.toString() ?? '';
    exitCode = err.status ?? -1;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // not JSON — error path
  }

  if (!parsed) {
    const head = stdout.trim().split('\n').slice(0, 3).join(' / ');
    console.log(`ERROR\t${rel}\t(exit ${exitCode}) ${head}`);
    continue;
  }

  const mech = parsed.mechanism ?? 'absent';
  const failures = parsed.mechanismFailures ?? [];
  const codes = [...new Set(failures.map((f) => f.code))].join(',');
  const partCount = parsed.partCount ?? 0;

  if (mech === 'broken') {
    console.log(`BROKEN\t${rel}\tparts=${partCount}\tfailures=${failures.length}\tcodes=${codes}`);
  } else if (mech === 'unverified') {
    console.log(`UNVERIFIED\t${rel}\tparts=${partCount}\tnote=${parsed.diagnostics?.length ?? 0} legacy diags`);
  } else if (mech === 'real') {
    console.log(`OK\t${rel}\tparts=${partCount}\tmechanism=real`);
  } else if (parsed.ok === true) {
    console.log(`OK\t${rel}\tparts=${partCount}\tmechanism=${mech}`);
  } else {
    console.log(`OTHER\t${rel}\tparts=${partCount}\tmech=${mech}\tok=${parsed.ok}`);
  }
}
