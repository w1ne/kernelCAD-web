// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// #945 post-merge: writePack must verify each export is a regular file inside
// the pack directory BEFORE reading it into the zip. The exporter is stubbed so
// the export "succeeds" while its destination is a symlink (or a part file
// outside the pack dir); neither file's contents may end up in the archive.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, symlinkSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const stub = vi.hoisted(() => ({ impl: undefined as undefined | ((out: string) => Record<string, unknown>) }));
vi.mock('./exportModel', () => ({
  exportModelTool: async (input: { output_path: string }) => stub.impl!(input.output_path),
}));

import { fabPackTool } from './fabPack';

let dir: string;
let secret: string;

describe('fab_pack zip reads (#945)', () => {
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'fabpack-read-'));
    secret = join(dir, 'secret.txt');
    writeFileSync(secret, 'TOP-SECRET');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('refuses an export path that is a symlink to a file outside the pack', async () => {
    const out = join(dir, 'pack-link');
    stub.impl = (p) => { symlinkSync(secret, p); return { ok: true, output_path: p, byte_count: 10 }; };
    const r = await fabPackTool({ code: 'return box(1,1,1);', output_dir: out, formats: ['step'] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/symbolic link/);
    expect(existsSync(join(out, 'part-fab-pack.zip'))).toBe(false);
  });

  it('refuses a part file that lies outside the pack directory', async () => {
    const out = join(dir, 'pack-outside');
    stub.impl = (p) => {
      writeFileSync(p, 'ok');
      return { ok: true, output_path: p, byte_count: 2, part_files: [secret] };
    };
    const r = await fabPackTool({ code: 'return box(1,1,1);', output_dir: out, formats: ['dxf'] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/outside the pack directory/);
    expect(readdirSync(out).some(f => f.endsWith('.zip'))).toBe(false);
  });

  it('still packs regular files inside the pack directory', async () => {
    const out = join(dir, 'pack-ok');
    stub.impl = (p) => { writeFileSync(p, 'ISO-10303-21;'); return { ok: true, output_path: p, byte_count: 13 }; };
    const r = await fabPackTool({ code: 'return box(1,1,1);', output_dir: out, formats: ['step'] });
    expect(r.ok).toBe(true);
    expect(existsSync(r.zip_path!)).toBe(true);
  });
});
