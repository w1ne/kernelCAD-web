// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { CaptureSession } from '../../modeling/capture/captureSession';
import type { SelectionRecord } from '../../shared/intent/selectionRecord';
import { buildModel, buildModelFromFile } from '../../composition/buildModel';
import { disposeSessionGeometry } from '../../modeling/warm/releaseShapes';
import { retainedMcpViewerModel } from './viewerRetain';

export interface ScriptSourceInput {
  file?: string;
  code?: string;
}

export interface ActiveMcpSession {
  /** Script file this session was evaluated from, when it came from a file. */
  file?: string;
  /** Script text this session was evaluated from. */
  code?: string;
  /** What the model's selectors bound to; the baseline for re-evaluating the same file. */
  selections?: SelectionRecord[];
  /** Array returns have no single root geometry for step evidence. */
  stepEvidenceSupported?: boolean;
  session: CaptureSession;
  tailId?: string;
  tailShape?: ShapeBackend;
  /** Feature id of the script's `return` value (Shape or Scene); falls
   *  back to the tail when the script returned nothing lowerable. */
  rootId?: string;
  /** Lowered shape of the script's `return` value. Prefer this over
   *  `tailShape` in probe / measurement consumers. */
  rootShape?: ShapeBackend;
}

let activeSession: ActiveMcpSession | undefined;

export function getActiveMcpSession(): ActiveMcpSession | undefined {
  return activeSession;
}

export function setActiveMcpSession(next: ActiveMcpSession | undefined): void {
  const previous = activeSession;
  activeSession = next;
  if (!previous || previous.session === next?.session) return;
  // The local viewer still serves the previous model until its own update
  // replaces it. Hosted evaluation does not keep that model.
  const viewerHoldsPrevious = process.env.KERNELCAD_MCP_MODE !== 'hosted'
    && retainedMcpViewerModel()?.session === previous.session;
  if (viewerHoldsPrevious) return;
  disposeSessionGeometry(previous.session);
}

export function clearActiveMcpSession(): void {
  setActiveMcpSession(undefined);
}

export async function establishActiveMcpSession(input: ScriptSourceInput): Promise<ActiveMcpSession> {
  const model = input.code !== undefined
    ? await buildModel({ code: input.code, fileName: input.file ?? '<inline>' })
    : await buildModelFromFile({ file: input.file! });
  activeSession = {
    stepEvidenceSupported: !Array.isArray(model.returnValue),
    session: model.session,
    tailId: model.tailId,
    tailShape: model.tailShape,
    rootId: model.rootId,
    rootShape: model.rootShape,
  };
  return activeSession;
}
