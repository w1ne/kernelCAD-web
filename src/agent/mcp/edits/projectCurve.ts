// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/projectCurve.ts
//
// W3: insert a `<shape>.projectCurve({...})` chained call into a .kcad.ts
// script before the last top-level `return`. Pure-string AST edit.
//
// The emitted call matches the runtime `Shape.projectCurve` API exactly: it
// takes a STRUCTURED `source` of type `ProjectCurveSource`
// (`{ kind: 'sketchCommands', commands: SketchCommand[] }`), NOT a bare
// `curve:` expression. The serializer turns the agent's plain-number 2D path
// commands into the Param-shaped SketchCommand[] wire format that the lowerer
// (projectCurveLowerer.ts -> drawingFromCommands) consumes.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';
import type { Vec3 } from '../../../shared/intent/types';
import type { ProjectCurveSourcePlane } from '../../../shared/intent/projectCurveRecord';

/** A single 2D path command, agent-facing (plain numbers). Mirrors the
 *  closed-curve subset of `SketchCommand` that the projectCurve lowerer
 *  supports today: `moveTo` (required first) + `lineTo` + `close`. */
export type ProjectCurveCommand =
  | { kind: 'moveTo'; x: number; y: number }
  | { kind: 'lineTo'; x: number; y: number }
  | { kind: 'close' };

export interface AddProjectCurveInput {
  /** The .kcad.ts source code to edit. */
  code: string;
  /** Variable name of the Shape to chain onto. */
  target: string;
  /** 2D path as plain-number commands. Closed mode requires a final `close`;
   * open mode requires one open chain with no `close`. */
  commands: readonly ProjectCurveCommand[];
  /** Target face: canonical name or label. */
  face: string;
  /** `Drawing.sketchOnFace` scaling mode; defaults to 'original'. */
  scaleMode?: 'original' | 'native' | 'bounds';
  /** Project as an open edge set instead of a closed face-bound sketch. */
  asEdge?: boolean;
  /** Required when asEdge is true. Origin is in mm; axes define the source frame. */
  sourcePlane?: ProjectCurveSourcePlane;
  /** Required when asEdge is true. World-space projection direction. */
  direction?: Vec3;
  /** Optional local variable name. Emits `const <bindAs> = <target>.projectCurve(...);`. */
  bindAs?: string;
}

/** Serialize a plain number as a Param literal `{ expression, unit, evaluated }`,
 *  the shape `toParam(n, 'mm')` produces at capture time and the shape the
 *  lowerer's `drawingFromCommands` reads via `.evaluated`. */
function paramLiteral(n: number): string {
  return `{ expression: '${n}', unit: 'mm', evaluated: ${n} }`;
}

function serializeCommand(cmd: ProjectCurveCommand): string {
  if (cmd.kind === 'close') return `{ kind: 'close' }`;
  return `{ kind: '${cmd.kind}', x: ${paramLiteral(cmd.x)}, y: ${paramLiteral(cmd.y)} }`;
}

function serializeOpts(input: AddProjectCurveInput): string {
  const commandsLiteral = input.commands.map(serializeCommand).join(', ');
  const source = `source: { kind: 'sketchCommands', commands: [${commandsLiteral}] }`;
  const fields: string[] = [source, `face: '${input.face}'`];
  if (input.asEdge === true) {
    const plane = input.sourcePlane!;
    fields.push(
      'asEdge: true',
      `sourcePlane: { origin: [${plane.origin.join(', ')}], normal: [${plane.normal.join(', ')}], xAxis: [${plane.xAxis.join(', ')}] }`,
      `direction: [${input.direction!.join(', ')}]`,
    );
  } else if (input.scaleMode !== undefined) {
    fields.push(`scaleMode: '${input.scaleMode}'`);
  }
  return `{ ${fields.join(', ')} }`;
}

export function addProjectCurve(input: AddProjectCurveInput): AddFeatureResult {
  if (typeof input.target !== 'string' || input.target.length === 0) {
    return { ok: false, error: 'add_project_curve: target Shape variable name is required.' };
  }
  if (!Array.isArray(input.commands) || input.commands.length === 0) {
    return {
      ok: false,
      error: 'add_project_curve: commands must be a non-empty 2D path (e.g. [{kind:"moveTo",x:0,y:0},{kind:"lineTo",x:2,y:0},...,{kind:"close"}]).',
    };
  }
  if (input.commands[0]?.kind !== 'moveTo') {
    return { ok: false, error: 'add_project_curve: commands must start with a moveTo.' };
  }
  if (input.asEdge === true) {
    if (input.commands.some((command) => command.kind === 'close')) {
      return { ok: false, error: 'add_project_curve: open projection commands must not include close.' };
    }
    if (input.commands.length < 2 || input.commands.slice(1).some((command) => command.kind === 'moveTo')) {
      return { ok: false, error: 'add_project_curve: open projection needs one moveTo followed by at least one segment.' };
    }
    if (input.sourcePlane === undefined || input.direction === undefined) {
      return { ok: false, error: 'add_project_curve: asEdge:true requires sourcePlane and direction.' };
    }
    if (input.scaleMode !== undefined) {
      return { ok: false, error: 'add_project_curve: scaleMode applies only to closed projection.' };
    }
    if (!isSourcePlane(input.sourcePlane) || !isFiniteVec3(input.direction)) {
      return { ok: false, error: 'add_project_curve: sourcePlane vectors and direction must be finite Vec3 values.' };
    }
    if (Math.hypot(...input.sourcePlane.normal) < 1e-12 ||
      Math.hypot(...input.sourcePlane.xAxis) < 1e-12 || Math.hypot(...input.direction) < 1e-12) {
      return { ok: false, error: 'add_project_curve: sourcePlane.normal, sourcePlane.xAxis and direction must be non-zero.' };
    }
  } else if (input.commands[input.commands.length - 1]?.kind !== 'close') {
    return { ok: false, error: 'add_project_curve: closed projection commands must end with close.' };
  } else if (input.sourcePlane !== undefined || input.direction !== undefined) {
    return { ok: false, error: 'add_project_curve: sourcePlane and direction are only valid with asEdge:true.' };
  }
  if (typeof input.face !== 'string' || input.face.length === 0) {
    return { ok: false, error: 'add_project_curve: face name is required.' };
  }
  const optsLiteral = serializeOpts(input);
  const callExpr = `${input.target}.projectCurve(${optsLiteral})`;
  const awaitedCall = input.asEdge === true ? `await ${callExpr}` : callExpr;
  const featureLine = input.bindAs
    ? `const ${input.bindAs} = ${awaitedCall};`
    : `${awaitedCall};`;
  return addFeature(input.code, featureLine);
}

function isSourcePlane(value: unknown): value is ProjectCurveSourcePlane {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const plane = value as Record<string, unknown>;
  return isFiniteVec3(plane.origin) && isFiniteVec3(plane.normal) && isFiniteVec3(plane.xAxis);
}

function isFiniteVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 &&
    value.every((component) => typeof component === 'number' && Number.isFinite(component));
}
