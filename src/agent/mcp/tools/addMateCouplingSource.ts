import { addMateCouplingSource, type AddMateCouplingSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { AddMateCouplingSourceInput };

export function addMateCouplingSourceTool(input: AddMateCouplingSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(addMateCouplingSource(input));
}
