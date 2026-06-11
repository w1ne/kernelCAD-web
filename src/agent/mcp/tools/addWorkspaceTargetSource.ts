// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addWorkspaceTargetSource, type AddWorkspaceTargetSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { AddWorkspaceTargetSourceInput };

export function addWorkspaceTargetSourceTool(input: AddWorkspaceTargetSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(addWorkspaceTargetSource(input));
}
