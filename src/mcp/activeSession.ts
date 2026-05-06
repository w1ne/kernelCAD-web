import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ShapeBackend } from '../backends/backend';
import { initOcct } from '../backends/occt/occtBackend';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { RecomputeEngine } from '../compute/recomputeEngine';
import type { CaptureSession } from '../capture/captureSession';
import { runScript } from '../script-runtime/runScript';

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
  await initOcct();
  const { code, fileName } = await readScriptSource(input);
  const run = await runScript({ code, fileName });
  const session = run.session;
  const engine = new RecomputeEngine(new OcctLowerer());
  const result = await engine.run(run.records, {
    paramTable: session.paramTable,
    warningSink: warning => session.warnings.push(warning),
    warningPhase: 'build',
    gatedFeatureNames: session.gatedFeatureNames,
  });
  for (const [id, shape] of result.shapes) {
    session.cachedShapes.set(id, shape);
  }
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const tailShape = tailId ? result.shapes.get(tailId) : undefined;
  activeSession = { session, tailId, tailShape };
  return activeSession;
}

async function readScriptSource(input: ScriptSourceInput): Promise<{ code: string; fileName: string }> {
  if (input.code !== undefined) {
    return { code: input.code, fileName: input.file ?? '<inline>' };
  }
  if (input.file !== undefined) {
    const filePath = resolve(input.file);
    return { code: await readFile(filePath, 'utf8'), fileName: filePath };
  }
  throw new Error('Must provide either { file } or { code }.');
}
