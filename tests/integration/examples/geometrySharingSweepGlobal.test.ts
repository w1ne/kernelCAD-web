// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Global guard behind the sharded sweep: the known-sharing examples must all
// exist and be among the swept assemblies, so the sweep cannot go vacuous.
import { expect, it } from 'vitest';
import { assemblyExamples, KNOWN_SHARING } from './geometrySharingSweepShared';

it('the sweep covers at least one known-sharing example, and all of them', () => {
  expect(KNOWN_SHARING.length).toBeGreaterThan(0);
  for (const p of KNOWN_SHARING) expect(assemblyExamples, p).toContain(p);
});
