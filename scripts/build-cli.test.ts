// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const buildCli = readFileSync(resolve(here, 'build-cli.mjs'), 'utf8');

// Regression guard for the Windows WASM-path bug: the CLI bundle's __dirname/
// __filename shim MUST use fileURLToPath, never `new URL(...).pathname`. On
// Windows, `new URL('file:///D:/x/').pathname` is "/D:/x/" (leading slash +
// drive), so the OCCT loader joins it into "D:\D:\...\replicad_single.wasm"
// and the kernel fails to load. fileURLToPath yields a native path on every OS.
describe('build-cli banner (Windows WASM-path safety)', () => {
  it('derives __dirname/__filename via fileURLToPath, not URL.pathname', () => {
    expect(buildCli).toContain('fileURLToPath');
    expect(buildCli).toContain('const __filename=__furl(import.meta.url);');
    expect(buildCli).toContain("const __dirname=__furl(new URL('.',import.meta.url));");
  });

  it('never reintroduces the exact Windows-broken `.pathname` banner lines', () => {
    expect(buildCli).not.toContain('const __filename=new URL(import.meta.url).pathname;');
    expect(buildCli).not.toContain("const __dirname=new URL('.',import.meta.url).pathname;");
  });
});
