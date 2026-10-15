// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regenerate the per-kernel feature-support list from the live lowerer tables.
//   npx tsx scripts/buildKernelCapabilities.ts
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildKernelCapabilities } from '../src/modeling/backends/kernelRegistry';

export const KERNEL_CAPABILITIES_PATH = resolve(
  import.meta.dirname,
  '../src/modeling/backends/kernelCapabilities.generated.json',
);

export function renderKernelCapabilities(): string {
  return JSON.stringify(buildKernelCapabilities(), null, 2) + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  writeFileSync(KERNEL_CAPABILITIES_PATH, renderKernelCapabilities());
  console.log(`wrote ${KERNEL_CAPABILITIES_PATH}`);
}
