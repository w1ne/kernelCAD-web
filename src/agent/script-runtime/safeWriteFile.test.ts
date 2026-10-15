// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, symlinkSync, mkdirSync, linkSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { safeWriteFile, safeWriteFileDetailed, removeIfCreated } from './safeWriteFile';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'safewrite-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('safeWriteFile', () => {
  it('writes a new file and reports it as created', async () => {
    const r = await safeWriteFileDetailed(join(dir, 'a.txt'), 'hello');
    expect(r.error).toBeUndefined();
    expect(r.created).toBe(true);
    expect(readFileSync(join(dir, 'a.txt'), 'utf8')).toBe('hello');
    expect(readdirSync(dir)).toEqual(['a.txt']);
  });

  it('replaces an existing file without truncating its hardlinks', async () => {
    const victim = join(dir, 'victim.txt');
    writeFileSync(victim, 'precious');
    linkSync(victim, join(dir, 'out.txt'));
    const r = await safeWriteFileDetailed(join(dir, 'out.txt'), 'new');
    expect(r.error).toBeUndefined();
    expect(r.created).toBe(false);
    expect(readFileSync(join(dir, 'out.txt'), 'utf8')).toBe('new');
    expect(readFileSync(victim, 'utf8')).toBe('precious');
  });

  it('refuses a symlinked destination file', async () => {
    writeFileSync(join(dir, 'target'), 'precious');
    symlinkSync(join(dir, 'target'), join(dir, 'out.txt'));
    expect(await safeWriteFile(join(dir, 'out.txt'), 'x')).toMatch(/symbolic link/);
    expect(readFileSync(join(dir, 'target'), 'utf8')).toBe('precious');
  });

  it('writes into the real folder when the parent is a symlink, and refuses a parent that resolves to a protected path', async () => {
    mkdirSync(join(dir, 'real'));
    symlinkSync(join(dir, 'real'), join(dir, 'link'));
    expect(await safeWriteFile(join(dir, 'link', 'a.txt'), 'ok')).toBeUndefined();
    expect(readFileSync(join(dir, 'real', 'a.txt'), 'utf8')).toBe('ok');
    symlinkSync('/etc', join(dir, 'etc-link'));
    expect(await safeWriteFile(join(dir, 'etc-link', 'kcad-test.txt'), 'x')).toMatch(/Refusing/);
    expect(existsSync('/etc/kcad-test.txt')).toBe(false);
    if (existsSync(join(homedir(), '.ssh'))) {
      symlinkSync(join(homedir(), '.ssh'), join(dir, 'ssh-link'));
      expect(await safeWriteFile(join(dir, 'ssh-link', 'authorized_keys'), 'x')).toMatch(/Refusing/);
    }
  });

  it('removeIfCreated deletes only a file this write created and that is still in place', async () => {
    writeFileSync(join(dir, 'old.txt'), 'old');
    const pre = await safeWriteFileDetailed(join(dir, 'old.txt'), 'new');
    await removeIfCreated(pre);
    expect(existsSync(join(dir, 'old.txt'))).toBe(true);

    const fresh = await safeWriteFileDetailed(join(dir, 'fresh.txt'), 'x');
    renameSync(join(dir, 'fresh.txt'), join(dir, 'moved.txt'));
    writeFileSync(join(dir, 'fresh.txt'), 'someone else');
    await removeIfCreated(fresh);
    expect(readFileSync(join(dir, 'fresh.txt'), 'utf8')).toBe('someone else');

    const mine = await safeWriteFileDetailed(join(dir, 'mine.txt'), 'x');
    await removeIfCreated(mine);
    expect(existsSync(join(dir, 'mine.txt'))).toBe(false);
  });
});
