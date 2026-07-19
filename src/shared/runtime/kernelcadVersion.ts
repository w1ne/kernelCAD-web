// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The kernelCAD version string, as stamped into exported STL/GLB/DXF/3MF
// headers.
//
// Reading it means reading `package.json`, which the exporters did with
// `createRequire` from `node:module` at MODULE SCOPE. `exportStlBinary` sits in
// the modeling API's import graph (api.ts -> sdf/materialize -> occtBackend ->
// exportStlBinary), so that one line put `node:module` in every browser bundle.
//
// Same seam as `hostFs.ts`: pure registry here, node installer next door
// (`kernelcadVersionNode.ts`). Browsers that never install it stamp
// `'unknown'`, which is exactly what the old `loadPkg()` fallback produced when
// neither candidate path resolved.

let version = 'unknown';

export function installKernelcadVersion(v: string): void {
  version = v;
}

export function kernelcadVersion(): string {
  return version;
}
