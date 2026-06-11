// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/listTopology.ts
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { runMcpScript } from '../runMcpScript';

export interface ListTopologyInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export interface ListTopologyOutput {
  ok: boolean;
  hasTrackedTopology?: boolean;
  faceNames?: string[];
  edgeCount?: number;
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on both failure paths:
   *  (1) script-runtime exception → `KernelError` code or
   *  `cli.script-exception` for non-kernel throws; (2) lowering-error path →
   *  the first error diagnostic's `code`. */
  errorCode?: string;
}

const BOX_FACES = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;
const CYLINDER_FACES = ['top', 'bottom'] as const;

export async function listTopologyTool(input: ListTopologyInput): Promise<ListTopologyOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;

  if (run.records.length === 0) return { ok: false, error: 'Script produced no features.' };

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  if (!run.records.some(r => r.id === targetId)) {
    return { ok: false, error: `feature_id '${targetId}' not found.` };
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = result.shapes.get(targetId);
  if (!shape) {
    const fatal = result.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' did not lower successfully: ${fatal.message}`
        : `Feature '${targetId}' did not lower successfully.`,
      errorCode: fatal?.code,
    };
  }

  const occt = shape as OcctBackend;
  let faceNames: string[];
  let hasTrackedTopology: boolean;

  switch (occt.kind) {
    case 'box':
      faceNames = [...BOX_FACES];
      hasTrackedTopology = true;
      break;
    case 'cylinder':
      faceNames = [...CYLINDER_FACES];
      hasTrackedTopology = true;
      break;
    case 'sphere':
      faceNames = [];
      hasTrackedTopology = true;
      break;
    default:
      faceNames = [];
      hasTrackedTopology = false;
      break;
  }

  const replicadShape = occt.getReplicadShape();
  const edgeCount = replicadShape.edges.length;

  return { ok: true, hasTrackedTopology, faceNames, edgeCount };
}
