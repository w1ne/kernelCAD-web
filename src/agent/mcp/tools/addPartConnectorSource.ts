// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addPartConnectorSource, type AddPartConnectorSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { AddPartConnectorSourceInput };

export function addPartConnectorSourceTool(input: AddPartConnectorSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(addPartConnectorSource(input));
}
