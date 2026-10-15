// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, open, rename, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, zipSync } from 'fflate';

const openRace = vi.hoisted(() => ({ candidate: undefined as string | undefined, parked: undefined as string | undefined, secret: undefined as string | undefined }));
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (path: string, ...args: Parameters<typeof actual.open>[1][]) => {
      const handle = await actual.open(path, ...args as [typeof args[0]]);
      if (path === openRace.candidate && openRace.parked && openRace.secret) {
        await actual.rename(path, openRace.parked);
        await actual.symlink(openRace.secret, path);
      }
      return handle;
    },
  };
});
import { meshBooleanTool } from './meshBoolean';

function cubeStl(): string {
  const positions = [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1];
  const triangles = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  const facets = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const points = triangles.slice(i, i + 3).map(vertex => {
      const j = vertex * 3;
      return `${positions[j]} ${positions[j + 1]} ${positions[j + 2]}`;
    });
    facets.push(`facet normal 0 0 0\nouter loop\n${points.map(p => `vertex ${p}`).join('\n')}\nendloop\nendfacet`);
  }
  return `solid cube\n${facets.join('\n')}\nendsolid cube`;
}

function cubeObj(): string {
  const vertices = ['-1 -1 -1', '1 -1 -1', '1 1 -1', '-1 1 -1', '-1 -1 1', '1 -1 1', '1 1 1', '-1 1 1'];
  const faces = ['1 3 2', '1 4 3', '5 6 7', '5 7 8', '1 2 6', '1 6 5',
    '2 3 7', '2 7 6', '3 4 8', '3 8 7', '4 1 5', '4 5 8'];
  return `${vertices.map(vertex => `v ${vertex}`).join('\n')}\n${faces.map(face => `f ${face}`).join('\n')}`;
}

function cube3mf(): Uint8Array {
  const vertices = ['-1 -1 -1', '1 -1 -1', '1 1 -1', '-1 1 -1', '-1 -1 1', '1 -1 1', '1 1 1', '-1 1 1'];
  const faces = ['0 2 1', '0 3 2', '4 5 6', '4 6 7', '0 1 5', '0 5 4',
    '1 2 6', '1 6 5', '2 3 7', '2 7 6', '3 0 4', '3 4 7'];
  const model = `<model unit="millimeter"><resources><object id="1"><mesh><vertices>${vertices.map(vertex => {
    const [x, y, z] = vertex.split(' ');
    return `<vertex x="${x}" y="${y}" z="${z}"/>`;
  }).join('')}</vertices><triangles>${faces.map(face => {
    const [v1, v2, v3] = face.split(' ');
    return `<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`;
  }).join('')}</triangles></mesh></object></resources></model>`;
  return zipSync({ '3D/model.model': new TextEncoder().encode(model) });
}

describe('mesh_boolean MCP tool', () => {
  it('returns the measured mesh volume and a binary STL payload', async () => {
    const data = Buffer.from(cubeStl()).toString('base64');
    const result = await meshBooleanTool({
      operation: 'union',
      a: { data, format: 'stl' },
      b: { data, format: 'stl' },
    });
    expect(result).toMatchObject({ ok: true, operation: 'union', volumeMm3: 8, format: 'stl', triangleCount: 12 });
    const bytes = Buffer.from(result.data_base64!, 'base64');
    expect(bytes.readUInt32LE(80)).toBe(result.triangleCount);
  });

  it.each([
    ['OBJ', Buffer.from(cubeObj()).toString('base64'), 'obj'],
    ['3MF', Buffer.from(cube3mf()).toString('base64'), '3mf'],
  ])('accepts closed %s triangle soup after rebuilding shared vertex indices', async (_label, data, format) => {
    const result = await meshBooleanTool({
      operation: 'union', a: { data, format: format as 'obj' | '3mf' },
      b: { data: Buffer.from(cubeStl()).toString('base64'), format: 'stl' },
    });
    expect(result.ok, result.error).toBe(true);
    expect(result.volumeMm3).toBeCloseTo(8);
  });

  it('returns actionable errors for invalid inputs', async () => {
    await expect(meshBooleanTool({
      operation: 'subtract', a: { data: 'c29saWQ=' }, b: { data: 'c29saWQ=' },
    })).resolves.toMatchObject({ ok: false, error: expect.stringContaining('STL parse failed') });
  });

  it('rejects malformed base64 instead of decoding a partial payload', async () => {
    for (const data of ['YQ=', 'YQ==garbage', 'YQ==\n', 'YR==']) {
      await expect(meshBooleanTool({
        operation: 'union', a: { data }, b: { data: Buffer.from(cubeStl()).toString('base64'), format: 'stl' },
      })).resolves.toMatchObject({ ok: false, error: 'Mesh data must be valid base64.' });
    }
  });

  it('rejects oversized files based on metadata before reading their contents', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mesh-boolean-size-'));
    const oversizedFile = join(directory, 'oversized.stl');
    try {
      await writeFile(oversizedFile, '');
      await truncate(oversizedFile, 50 * 1024 * 1024 + 1);
      await expect(meshBooleanTool({
        operation: 'union', workspaceRoot: directory, a: { file: oversizedFile }, b: { data: Buffer.from(cubeStl()).toString('base64'), format: 'stl' },
      })).resolves.toMatchObject({ ok: false, error: 'Mesh input must be between 1 byte and 50 MB.' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('restricts file operands to the workspace root, including symlink targets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mesh-boolean-root-'));
    const outside = await mkdtemp(join(tmpdir(), 'mesh-boolean-outside-'));
    const secret = join(outside, 'secret.stl');
    try {
      await writeFile(secret, cubeStl());
      await symlink(secret, join(root, 'escape.stl'));
      const data = Buffer.from(cubeStl()).toString('base64');
      for (const file of [secret, join(root, 'escape.stl')]) {
        await expect(meshBooleanTool({
          operation: 'union', workspaceRoot: root, a: { file }, b: { data, format: 'stl' },
        })).resolves.toMatchObject({ ok: false, error: 'Mesh file must be inside the workspace root.' });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it('rejects a symlink swapped outside the workspace after the file is opened', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mesh-boolean-race-root-'));
    const outside = await mkdtemp(join(tmpdir(), 'mesh-boolean-race-outside-'));
    const candidate = join(root, 'candidate.stl');
    const parked = join(root, 'candidate.parked');
    const secret = join(outside, 'secret.stl');
    try {
      await writeFile(candidate, cubeStl());
      await writeFile(secret, cubeStl());
      const data = Buffer.from(cubeStl()).toString('base64');
      Object.assign(openRace, { candidate, parked, secret });
      const result = await meshBooleanTool({
        operation: 'union', workspaceRoot: root,
        a: { file: candidate }, b: { data, format: 'stl' },
      });
      openRace.candidate = openRace.parked = openRace.secret = undefined;
      expect(result).toMatchObject({ ok: false });
      expect(result.error).toMatch(/inside the workspace root|changed while it was being opened/);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it('rejects 3MF operands with incompatible unit provenance', async () => {
    const millimeter = cube3mf();
    const inchModel = new TextDecoder().decode(unzipSync(millimeter)['3D/model.model']).replace('unit="millimeter"', 'unit="inch"');
    const inch = zipSync({ '3D/model.model': new TextEncoder().encode(inchModel) });
    const mmData = Buffer.from(millimeter).toString('base64');
    await expect(meshBooleanTool({
      operation: 'union', a: { data: mmData, format: '3mf' },
      b: { data: Buffer.from(inch).toString('base64'), format: '3mf' },
    })).resolves.toMatchObject({ ok: false, error: expect.stringContaining('different unit provenance') });
  });

  it('enforces the file size limit while reading', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mesh-boolean-stream-'));
    const oversizedFile = join(directory, 'oversized.stl');
    try {
      await writeFile(oversizedFile, '');
      await truncate(oversizedFile, 50 * 1024 * 1024 + 1);
      await expect(meshBooleanTool({
        operation: 'union', workspaceRoot: directory, a: { file: oversizedFile },
        b: { data: Buffer.from(cubeStl()).toString('base64'), format: 'stl' },
      })).resolves.toMatchObject({ ok: false, error: 'Mesh input must be between 1 byte and 50 MB.' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
