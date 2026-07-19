// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Node installer for the version registry (see `kernelcadVersion.ts`). Importing
// this module installs the version as a side effect. The path probing is copied
// verbatim from the old inline `loadPkg()` in exportStlBinary.ts so node output
// is unchanged.
/// <reference types="node" />
import { createRequire } from 'node:module';
import { installKernelcadVersion } from './kernelcadVersion';

const requireFromHere = createRequire(import.meta.url);

// At source: src/shared/runtime/kernelcadVersionNode.ts → ../../../package.json (3 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
function loadPkg(): { version: string } {
  for (const rel of ['../../../package.json', '../../package.json', '../../../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}

installKernelcadVersion(loadPkg().version);
