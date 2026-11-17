// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP wrapper for labeled STEP inspect views.

import {
  inspectStepViews,
  type InspectStepViewsInput,
  type InspectStepViewsResult,
} from '../../inspect/stepInspectViews';

export async function inspectStepViewsTool(input: InspectStepViewsInput): Promise<InspectStepViewsResult> {
  return inspectStepViews(input);
}
