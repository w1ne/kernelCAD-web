// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { beforeAll, describe, expect, it } from 'vitest';
import { OcctBackend, initOcct } from './occtBackend';

beforeAll(async () => {
  await initOcct();
});

describe('OcctBackend.solidComponents', () => {
  it('reads disconnected BREP solids directly instead of inferring them from preview triangles', () => {
    const part = OcctBackend.box(20, 12, 8, true)
      .union(OcctBackend.cylinder(18, 4).translate(55, 0, -9));

    const components = part.solidComponents();

    expect(components).toHaveLength(2);
    expect(components.map((component) => component.volume())).toEqual(
      expect.arrayContaining([
        expect.closeTo(20 * 12 * 8, 1),
        expect.closeTo(Math.PI * 4 ** 2 * 18, 1),
      ]),
    );
  });

  it('reports one solid after a real overlapping union', () => {
    const part = OcctBackend.box(20, 12, 8, true)
      .union(OcctBackend.box(10, 12, 8, true).translate(14, 0, 0));

    expect(part.solidComponents()).toHaveLength(1);
  });
});
