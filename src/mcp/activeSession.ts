import type { ShapeBackend } from '../kernel/backends/backend';
import type { CaptureSession } from '../capture/captureSession';
import { buildModel, buildModelFromFile } from '../modeling/buildModel';

export interface ScriptSourceInput {
  file?: string;
  code?: string;
}

export interface ActiveMcpSession {
  session: CaptureSession;
  tailId?: string;
  tailShape?: ShapeBackend;
}

let activeSession: ActiveMcpSession | undefined;

export function getActiveMcpSession(): ActiveMcpSession | undefined {
  return activeSession;
}

export function setActiveMcpSession(next: ActiveMcpSession | undefined): void {
  activeSession = next;
}

export function clearActiveMcpSession(): void {
  activeSession = undefined;
}

export async function establishActiveMcpSession(input: ScriptSourceInput): Promise<ActiveMcpSession> {
  const model = input.code !== undefined
    ? await buildModel({ code: input.code, fileName: input.file ?? '<inline>' })
    : await buildModelFromFile({ file: input.file! });
  activeSession = {
    session: model.session,
    tailId: model.tailId,
    tailShape: model.tailShape,
  };
  return activeSession;
}
