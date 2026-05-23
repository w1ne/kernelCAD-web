import { addTransmissionSource, type AddTransmissionSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { AddTransmissionSourceInput };

export function addTransmissionSourceTool(input: AddTransmissionSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(addTransmissionSource(input));
}
