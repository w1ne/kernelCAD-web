// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/traceFromImage.ts
//
// MCP wrapper for `trace_from_image`. Thin pass-through over the orchestrator
// in `src/agent/vision/index.ts` so the MCP layer stays free of opencv /
// Anthropic-SDK static imports — those modules are only reached lazily when
// the orchestrator dispatches to a backend that needs them.

import { traceFromImage } from '../../vision';
import type {
  TraceFromImageInput,
  TraceFromImageOutput,
} from '../../vision';

export type { TraceFromImageInput, TraceFromImageOutput };

export async function traceFromImageTool(
  input: TraceFromImageInput,
): Promise<TraceFromImageOutput> {
  return traceFromImage(input);
}
