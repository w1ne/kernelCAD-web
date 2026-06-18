// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addMateSource, type AddMateSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { AddMateSourceInput };

export function addMateSourceTool(input: AddMateSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(addMateSource(input));
}
