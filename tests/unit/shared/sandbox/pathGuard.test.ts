// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Sandbox path decision: relative, absolute, `..`, `~`, file: URLs and symlink escapes.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkSandboxPath, isWithin, realLocation } from '../../../../src/shared/sandbox/pathGuard';
import type { SandboxConfig } from '../../../../src/shared/sandbox/config';

let base: string;
let ws: string;
let outside: string;
let ro: string;
let cfg: SandboxConfig;
let cwd: string;

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'kc-sbx-path-')));
  ws = join(base, 'ws');
  outside = join(base, 'outside');
  ro = join(base, 'runtime');
  for (const d of [ws, outside, ro, join(ws, 'sub')]) mkdirSync(d, { recursive: true });
  writeFileSync(join(outside, 'secret.txt'), 'secret');
  writeFileSync(join(ws, 'part.step'), 'ISO-10303-21;');
  writeFileSync(join(ro, 'asset.bin'), 'x');
  symlinkSync(outside, join(ws, 'link-out'));              // dir link escaping the workspace
  symlinkSync(join(outside, 'secret.txt'), join(ws, 'secret-link.txt')); // file link escaping
  symlinkSync(join(outside, 'not-yet.txt'), join(ws, 'dangling.txt'));    // dangling link escaping
  symlinkSync(join(ws, 'sub'), join(ws, 'link-in'));       // link that stays inside
  cfg = {
    workspaceRoot: ws,
    readOnlyRoots: [ro],
    devicePaths: ['/dev/null'],
    scratch: { root: join(ws, '.s'), tmp: join(ws, '.s/tmp'), cache: join(ws, '.s/cache'), config: join(ws, '.s/config') },
    allowLoopback: false,
    source: 'api',
  };
  cwd = process.cwd();
  process.chdir(ws);
});

afterAll(() => {
  process.chdir(cwd);
  rmSync(base, { recursive: true, force: true });
});

describe('checkSandboxPath', () => {
  it('allows relative and absolute paths inside the workspace, existing or not', () => {
    expect(checkSandboxPath('part.step', 'read', cfg)).toMatchObject({ allowed: true, reason: 'workspace' });
    expect(checkSandboxPath('out/new/dir/x.stl', 'write', cfg)).toMatchObject({ allowed: true, resolved: join(ws, 'out/new/dir/x.stl') });
    expect(checkSandboxPath(join(ws, 'sub', 'a.step'), 'write', cfg).allowed).toBe(true);
    expect(checkSandboxPath(ws, 'read', cfg).allowed).toBe(true);
  });

  it('refuses absolute paths outside the workspace', () => {
    expect(checkSandboxPath(join(outside, 'secret.txt'), 'read', cfg)).toMatchObject({ allowed: false, reason: 'outside-workspace' });
    expect(checkSandboxPath('/etc/passwd', 'read', cfg).allowed).toBe(false);
  });

  it('collapses `..` before deciding (relative and embedded)', () => {
    expect(checkSandboxPath('../outside/secret.txt', 'read', cfg).allowed).toBe(false);
    expect(checkSandboxPath('sub/../../outside/x', 'write', cfg).allowed).toBe(false);
    expect(checkSandboxPath('sub/../part.step', 'read', cfg).allowed).toBe(true);
  });

  it('refuses a sibling directory that only shares the prefix', () => {
    mkdirSync(`${ws}-evil`, { recursive: true });
    expect(checkSandboxPath(`${ws}-evil/x`, 'write', cfg).allowed).toBe(false);
  });

  it('follows symlinks: directory, file and dangling links that escape are refused', () => {
    expect(checkSandboxPath('link-out/secret.txt', 'read', cfg)).toMatchObject({ allowed: false, resolved: join(outside, 'secret.txt') });
    expect(checkSandboxPath('link-out/new.txt', 'write', cfg).allowed).toBe(false);
    expect(checkSandboxPath('secret-link.txt', 'read', cfg).allowed).toBe(false);
    expect(checkSandboxPath('dangling.txt', 'write', cfg)).toMatchObject({ allowed: false, resolved: join(outside, 'not-yet.txt') });
  });

  it('allows symlinks that stay inside the workspace', () => {
    expect(checkSandboxPath('link-in/a.stl', 'write', cfg)).toMatchObject({ allowed: true, resolved: join(ws, 'sub', 'a.stl') });
  });

  it('expands ~ and file: URLs before deciding', () => {
    expect(checkSandboxPath('~/.ssh/id_rsa', 'read', cfg).allowed).toBe(false);
    expect(checkSandboxPath(pathToFileURL(join(outside, 'secret.txt')).href, 'read', cfg).allowed).toBe(false);
    expect(checkSandboxPath(pathToFileURL(join(ws, 'part.step')), 'read', cfg).allowed).toBe(true);
    expect(checkSandboxPath(Buffer.from(join(outside, 'secret.txt')), 'read', cfg).allowed).toBe(false);
  });

  it('read-only runtime roots are readable but never writable', () => {
    expect(checkSandboxPath(join(ro, 'asset.bin'), 'read', cfg)).toMatchObject({ allowed: true, reason: 'read-only-root' });
    expect(checkSandboxPath(join(ro, 'asset.bin'), 'write', cfg)).toMatchObject({ allowed: false, reason: 'read-only-root-write' });
  });

  it('allows the configured device paths', () => {
    expect(checkSandboxPath('/dev/null', 'write', cfg).allowed).toBe(true);
  });

  it('allows everything when the sandbox is off', () => {
    expect(checkSandboxPath('/etc/passwd', 'read', null).allowed).toBe(true);
  });

  it('isWithin / realLocation helpers', () => {
    expect(isWithin('/a/b', '/a')).toBe(true);
    expect(isWithin('/ab', '/a')).toBe(false);
    expect(realLocation(join(ws, 'missing', 'deep', 'file'))).toBe(join(ws, 'missing', 'deep', 'file'));
  });
});
