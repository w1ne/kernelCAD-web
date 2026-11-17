// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Shape } from './proxy';
import type { AssemblyPartOpts } from './assemblyTypes';

// Keep exhaustive with AssemblyPartOpts so new options remain accepted here.
const ASSEMBLY_PART_OPTION_KEYS: Readonly<Record<keyof AssemblyPartOpts, true>> = {
  at: true,
  connectors: true,
  connect: true,
  density: true,
  material: true,
  process: true,
  stock: true,
  massKg: true,
  crossSection: true,
  role: true,
  overlay: true,
};

export function assertAssemblyPartOptionKeys(name: string, shape: Shape, opts: AssemblyPartOpts): void {
  const unknownKey = Object.keys(opts).find((key) => !Object.hasOwn(ASSEMBLY_PART_OPTION_KEYS, key));
  if (unknownKey === undefined) return;
  invalidArgs({
    api: `assembly.part('${name}', shape, opts)`,
    path: `opts.${unknownKey}`,
    gotText: `an unknown option '${unknownKey}'`,
    requires: `one of ${Object.keys(ASSEMBLY_PART_OPTION_KEYS).join(', ')}`,
    example: "arm.part('bracket', box(20, 10, 4), { at: [0, 0, 12], material: 'aluminum' })",
    featureId: shape.id,
  });
}
