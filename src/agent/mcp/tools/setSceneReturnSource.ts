// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { setSceneReturnSource, type SetSceneReturnSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { SetSceneReturnSourceInput };

export function setSceneReturnSourceTool(input: SetSceneReturnSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(setSceneReturnSource(input));
}
