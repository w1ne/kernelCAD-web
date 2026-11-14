import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

beforeAll(async () => { await initOcct(); }, 60_000);

describe('Wayfarer gallery scene exports', () => {
  it.each(['integrated-wayfarer', 'product-detail-wayfarer'])('%s exports the frame and seven details', async (name) => {
    const fileName = resolve('examples/gallery/meta-glasses-experiments', `${name}.kcad.ts`);
    const code = await readFile(fileName, 'utf8');
    const result = await runAndExport({ code, fileName, format: 'glb' });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const doc = await new NodeIO().readBinary(result.bytes);
    const parts = doc.getRoot().listNodes().filter((node) => node.getMesh());
    expect(parts).toHaveLength(8);
    const names = parts.map((part) => part.getName());
    expect(names.some((part) => part.includes('frame'))).toBe(true);
    expect(names.some((part) => part.startsWith('left-') && part.includes('lens'))).toBe(true);
    expect(names.some((part) => part.startsWith('right-') && part.includes('lens'))).toBe(true);
    expect(names.some((part) => part.includes('camera'))).toBe(true);
    expect(names.some((part) => part.includes('led'))).toBe(true);
  }, 120_000);
});
