// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Re-export so scripts/captureDemo.ts and tests can keep their existing
// import path. The canonical implementation lives in src/modeling/runtime/
// where the CLI build can pick it up via tsconfig.cli.json's rootDir.
export { loadScriptFeatures, type LoadedScript } from '../../src/modeling/runtime/scriptLoader';
