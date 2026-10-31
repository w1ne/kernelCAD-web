// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Install the native build bindings for the current runner after `npm ci`.
// package-lock.json records these optional packages only for the platform that
// wrote it (npm/cli#4828), so `npm ci` skips them on other release runners.
// Versions come from the lockfile, so the dependency tree does not drift.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOSTS = ['rollup', 'esbuild', 'lightningcss', '@tailwindcss/oxide'];

const root = process.cwd();
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
const { platform, arch } = process;
const suffixes = platform === 'linux' ? ['-gnu', ''] : platform === 'win32' ? ['-msvc', ''] : [''];

const wanted = [];
for (const host of HOSTS) {
  const entry = lock.packages[`node_modules/${host}`];
  if (!entry) throw new Error(`${host} is missing from package-lock.json`);
  const optional = entry.optionalDependencies ?? {};
  const name = Object.keys(optional).find((dep) =>
    suffixes.some((suffix) => dep.endsWith(`-${platform}-${arch}${suffix}`) || dep.endsWith(`/${platform}-${arch}${suffix}`)),
  );
  if (!name) throw new Error(`${host}@${entry.version} has no binding for ${platform}-${arch}`);
  if (existsSync(resolve(root, 'node_modules', name, 'package.json'))) continue;
  wanted.push(`${name}@${optional[name]}`);
}

if (wanted.length === 0) {
  console.log(`Native bindings for ${platform}-${arch} are already installed`);
} else {
  console.log(`Installing native bindings for ${platform}-${arch}: ${wanted.join(' ')}`);
  const npm = platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npm, ['install', '--no-save', '--no-audit', '--no-fund', ...wanted], {
    stdio: 'inherit',
    shell: platform === 'win32',
  });
}
