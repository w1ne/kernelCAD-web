// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/vitest.setup.ts
//
// Global test bootstrap. Production defaults the remote parts tier to the
// step.parts public catalog, but the test suite must stay hermetic — no live
// catalog calls. Default it OFF here so any unmatched part lookup fails closed
// with `parts.fetch.remote-disabled` instead of hitting the network. Tests that
// exercise remote behavior opt in explicitly (delete this var or pass
// partsBaseUrl) and mock `fetch`. See src/modeling/parts/remoteClient.ts.
process.env.KERNELCAD_PARTS_BASE_URL ??= 'off';
