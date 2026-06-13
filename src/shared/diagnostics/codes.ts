// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Back-compat re-exports for the kernelCAD diagnostic vocabulary.
//
// The single source of truth is `./registry.ts` (DIAGNOSTIC_REGISTRY). Prefer
// importing from there in new code. This module is retained so existing
// import paths continue to compile during the migration window.

export type { DiagnosticCode, HintTemplate } from './registry';
export { DIAGNOSTIC_CODES, HINT_TEMPLATES } from './registry';
