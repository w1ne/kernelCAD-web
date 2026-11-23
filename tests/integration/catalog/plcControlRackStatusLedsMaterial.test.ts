// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/plc-control-rack.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/plc-control-rack status indicator materials', () => {
  it('uses separate channel, RUN, and ERROR lens colors and steel module housings', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(384);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'channelLed', 'runLed', 'errorLed',
    ]);
    expect(asset.presets.weathered).toMatchObject({
      channelLed: '#438f5c',
      runLed: '#438f5c',
      errorLed: '#763e43',
    });
    expect(asset.presets.highVisibility).toMatchObject({
      channelLed: '#55cf78',
      runLed: '#55cf78',
      errorLed: '#c44e52',
    });

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      return node?.getMesh()?.listPrimitives().flatMap((primitive) => {
        const vertexColors = primitive.getAttribute('COLOR_0');
        if (vertexColors !== null) {
          return Array.from({ length: vertexColors.getCount() }, (_, index) => {
            const color = vertexColors.getElement(index, []);
            return color.slice(0, 3).map((channel) =>
              channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055,
            );
          });
        }
        const material = primitive.getMaterial();
        return material === null ? [] : [material.getBaseColorFactor().slice(0, 3)];
      }) ?? [];
    };
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };

    for (const [row, expected] of [
      ['channel-led', '#4faf6e'],
      ['run-led', '#4faf6e'],
      ['error-led', '#8a4449'],
    ]) {
      for (let index = 0; index < 7; index += 1) {
        const part = `${row}-${index}`;
        const colors = colorsFor(part);
        expect(colors.length, `${part} should render`).toBeGreaterThan(0);
        expect(colors.every(matches(expected)), `${part} should use ${expected}`).toBe(true);
      }
    }

    for (const name of ['rack-base', 'top-crossbar', ...Array.from({ length: 7 }, (_, index) => `io-card-${index}`)]) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matches('#667984')), `${name} should use the steel finish`).toBe(true);
    }
  }, 120_000);
});
