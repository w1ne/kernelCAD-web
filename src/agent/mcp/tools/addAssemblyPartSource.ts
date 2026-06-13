// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addAssemblyPartSource, type AddAssemblyPartSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { AddAssemblyPartSourceInput };

export function addAssemblyPartSourceTool(input: AddAssemblyPartSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(addAssemblyPartSource(input));
}
