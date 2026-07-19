// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Node implementation of the host-filesystem port (see shared/runtime/hostFs.ts).
//
// It lives in the MODELING layer, not next to the port in `src/shared`, because
// it depends on `modeling/capture/imageDimensions` — and `src/shared` must stay
// a leaf that never imports upward (enforced by
// tests/unit/architecture/sharedBoundary.test.ts). The PORT is the shared
// contract; the IMPLEMENTATION is free to sit where its dependencies are.
//
// Importing this module INSTALLS the implementation as a side effect. That is
// deliberate: it makes the node door explicit and greppable. Every node entry
// point that runs user scripts imports it — `runScript.ts` (the node facade),
// the CLI/MCP entry, and the vitest setup file — so node behaviour is exactly
// what it was before the port existed. The browser never imports it, which is
// the whole point: `node:fs` stays out of the browser import graph.
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { installHostFs, type HostFs, type ImageDimensions } from '../../shared/runtime/hostFs';
import { resolveScriptRelativePath } from '../../shared/runtime/scriptRelativePath';
import { imageDimensions as readImageDimensions } from '../capture/imageDimensions';

export const nodeHostFs: HostFs = {
  fileExists(path: string): boolean {
    return existsSync(path);
  },
  imageDimensions(path: string): ImageDimensions {
    return readImageDimensions(path);
  },
  resolveScriptRelative(scriptDir: string | undefined, path: string): string {
    return resolveScriptRelativePath(scriptDir, path);
  },
  readFileBytes(path: string): Uint8Array {
    return new Uint8Array(readFileSync(path));
  },
};

installHostFs(nodeHostFs);
