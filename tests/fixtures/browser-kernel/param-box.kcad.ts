// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A minimal modern-runtime script for the browser-kernel routing E2E
// (tests/e2e/browserKernel.spec.ts). One numeric param with a declared range
// (the Params tab renders it as slider + value input) and a box whose X side
// is that param — the box visibly grows when the slider moves. No host-fs
// imports, no assembly/joint API: the browser kernel worker can warm and
// re-lower it.
const w = param('w', 10, { min: 1, max: 20 });

return box(w, 20, 5);
