// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/inspectRobot.ts
//
// Read-only introspection of an assembly as it would be exported. Returns
// the link/joint shape, declared planning groups + end-effectors, and any
// open issues (closed-loop, missing density) the export would surface.
// Use before export_model to preview the shape.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { urdfSerialize } from '../../../modeling/export/urdf/urdfSerializer';

export interface InspectRobotInput {
  file?: string;
  code?: string;
  assembly?: string;
}

export interface InspectRobotLink {
  name: string;
  /** Bounding-box extent in mm. */
  extentMm: [number, number, number];
  densityKgPerM3?: number;
}

export interface InspectRobotJoint {
  name: string;
  type: string;
  parent: string;
  child: string;
  limitsRad?: [number, number];
  limitsM?: [number, number];
}

export interface InspectRobotIssue {
  code: string;
  severity: 'error' | 'warn' | 'info';
  message: string;
}

export type InspectRobotOutput =
  | {
      ok: true;
      robotName: string;
      links: InspectRobotLink[];
      joints: InspectRobotJoint[];
      planningGroups: Array<{ name: string; members: string[] }>;
      endEffectors: Array<{ name: string; parentLink: string }>;
      openIssues: InspectRobotIssue[];
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;
    };

const DEG_TO_RAD = Math.PI / 180;
const MM_TO_M = 1e-3;

function selectAssembly(
  assemblies: Map<string, Assembly>,
  name?: string,
): Assembly | undefined {
  return name !== undefined
    ? assemblies.get(name)
    : assemblies.values().next().value;
}

export async function inspectRobotTool(input: InspectRobotInput): Promise<InspectRobotOutput> {
  const { evaluation, model } = await evaluateAndBuildScript(input as EvaluateInput);
  if (evaluation.exitCode !== 0 || !model) {
    return {
      ok: false,
      error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.',
      errorCode: evaluation.diagnostics[0]?.code,
    };
  }
  const arm = selectAssembly(model.session.assemblies as Map<string, Assembly>, input.assembly);
  if (!arm) {
    return {
      ok: false,
      error: input.assembly
        ? `inspect_robot: assembly '${input.assembly}' not found.`
        : 'inspect_robot: no assembly captured by the script.',
      errorCode: 'export.no-shape',
    };
  }

  // Run the URDF serializer once to collect open issues (closed-loop,
  // inertia-density-declared, etc). We don't care about the urdf string;
  // we only forward the diagnostics.
  const serializeResult = await urdfSerialize(arm, {});

  const parts = arm.__parts();
  const legacyJoints = arm.__joints();
  const mates = arm.__mates();

  // Build per-link summary: name + extent + declared density. Extent comes
  // from the lowered shape's bounding box (mm).
  const links: InspectRobotLink[] = [];
  for (const p of parts) {
    const lowered = await p.originalShape.lower();
    const bb = lowered.boundingBox();
    links.push({
      name: p.name,
      extentMm: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
      ...(p.density !== undefined ? { densityKgPerM3: p.density } : {}),
    });
  }

  const joints: InspectRobotJoint[] = [];
  for (const j of legacyJoints) {
    const parent = parts.find(p => p.id === j.parentPartId)?.name ?? '';
    const child = parts.find(p => p.id === j.childPartId)?.name ?? '';
    joints.push({
      name: j.name,
      type: j.kind,
      parent,
      child,
      ...(j.limitsDeg ? { limitsRad: [j.limitsDeg[0] * DEG_TO_RAD, j.limitsDeg[1] * DEG_TO_RAD] } : {}),
      ...(j.limitsMm ? { limitsM: [j.limitsMm[0] * MM_TO_M, j.limitsMm[1] * MM_TO_M] } : {}),
    });
  }
  for (const m of mates) {
    const parent = m.a.split('.')[0];
    const child = m.b.split('.')[0];
    joints.push({
      name: m.name,
      type: m.type,
      parent,
      child,
      ...(m.limitsDeg ? { limitsRad: [m.limitsDeg[0] * DEG_TO_RAD, m.limitsDeg[1] * DEG_TO_RAD] } : {}),
      ...(m.limitsMm ? { limitsM: [m.limitsMm[0] * MM_TO_M, m.limitsMm[1] * MM_TO_M] } : {}),
    });
  }

  const planningGroups = arm.__planningGroups().map(g => ({
    name: g.name,
    members: [
      ...(g.chain ? [g.chain.baseLink, g.chain.tipLink] : []),
      ...(g.joints ?? []),
      ...(g.links ?? []),
    ],
  }));
  const endEffectors = arm.__endEffectors().map(ee => ({ name: ee.name, parentLink: ee.parentLink }));

  return {
    ok: true,
    robotName: arm.name,
    links,
    joints,
    planningGroups,
    endEffectors,
    openIssues: serializeResult.diagnostics.map(d => ({
      code: d.code,
      severity: d.severity as 'error' | 'warn' | 'info',
      message: d.message,
    })),
  };
}
