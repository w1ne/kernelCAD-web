// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/kernelErrorToDiagnostic.ts
//
// Re-export of the shared implementation — the function moved to
// `src/shared/diagnostics/kernelErrorToDiagnostic.ts` so the composition layer
// can use it without importing agent code. Agent callers keep this path.
export { kernelErrorToDiagnostic } from '../../shared/diagnostics/kernelErrorToDiagnostic';
