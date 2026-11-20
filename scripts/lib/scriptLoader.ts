// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Re-export so scripts/captureDemo.ts and tests can keep their existing
// import path. The canonical entry point lives in src/composition/ (the
// composed script API, `kinematic.*` included), where the CLI build can pick
// it up via tsconfig.cli.json's rootDir.
export { loadScriptFeatures, type LoadedScript } from '../../src/composition/scriptLoader';
