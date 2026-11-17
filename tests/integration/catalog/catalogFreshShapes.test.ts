// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// catalog/AUTHORING.md: "Build a fresh shape for every copy." A model that
// transforms one handle several times only builds correctly where transforms
// return a new shape. A runtime that applies them in place stacks every copy
// at the accumulated position, so catalogue sources must not depend on it.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { runScript } from '../../../src/composition/runScript';

const kitsRoot = resolve(import.meta.dirname, '../../../catalog/kits');

it('no catalogue model derives several copies from one shape handle', async () => {
  const reused: string[] = [];
  let models = 0;
  for (const kit of readdirSync(kitsRoot, { withFileTypes: true })) {
    if (!kit.isDirectory()) continue;
    for (const name of readdirSync(join(kitsRoot, kit.name))) {
      if (!name.endsWith('.kcad.ts')) continue;
      const file = join(kitsRoot, kit.name, name);
      models++;
      const { session } = await runScript({
        code: readFileSync(file, 'utf8'), fileName: file, scriptDir: dirname(file),
      });
      // A fork is a copy the capture session made because a handle was
      // transformed again after something else had already used it.
      const forks = (session as unknown as { versions: { forks: Map<string, unknown> } }).versions.forks.size;
      if (forks > 0) reused.push(`${kit.name}/${name.replace('.kcad.ts', '')} (${forks})`);
    }
  }
  expect(models).toBeGreaterThan(2000);
  expect(reused).toEqual([]);
}, 300_000);
