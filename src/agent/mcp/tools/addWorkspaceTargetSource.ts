import { addWorkspaceTargetSource, type AddWorkspaceTargetSourceInput } from '../edits/assemblySourceEdits';
import { evaluateSourceEdit, type SourceEditToolOutput } from './sourceEditTool';

export type { AddWorkspaceTargetSourceInput };

export function addWorkspaceTargetSourceTool(input: AddWorkspaceTargetSourceInput): Promise<SourceEditToolOutput> {
  return evaluateSourceEdit(addWorkspaceTargetSource(input));
}
