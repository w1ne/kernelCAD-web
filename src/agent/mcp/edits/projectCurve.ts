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
  /** Closed 2D path to wrap onto the face, as plain-number commands. Must
   *  start with `moveTo` and end with `close`. Serialized into the runtime
   *  `source: { kind: 'sketchCommands', commands: [...] }` wire format. */
  commands: readonly ProjectCurveCommand[];
  /** Target face: canonical name or label. */
  face: string;
  /** `Drawing.sketchOnFace` scaling mode; defaults to 'original'. */
  scaleMode?: 'original' | 'native' | 'bounds';
  /** Project as an open edge instead of a closed face-bound sketch.
   *  NOT IMPLEMENTED — the lowerer does not synthesize an open-wire
   *  projection, so the serializer rejects it rather than emitting code that
   *  fails to evaluate. The OCCT binding exists; the lowering does not. */
  asEdge?: boolean;
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
  if (input.scaleMode !== undefined) fields.push(`scaleMode: '${input.scaleMode}'`);
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
  if (input.commands[input.commands.length - 1]?.kind !== 'close') {
    return { ok: false, error: 'add_project_curve: commands must end with a close (closed-curve projection only).' };
  }
  if (typeof input.face !== 'string' || input.face.length === 0) {
    return { ok: false, error: 'add_project_curve: face name is required.' };
  }
  if (input.asEdge === true) {
    // Open-wire projection is unimplemented in the lowerer. Reject at edit time
    // rather than emit code that the lowerer would reject anyway.
    return {
      ok: false,
      error: 'add_project_curve: asEdge:true (open-wire projection) is not implemented. Use a closed-curve projection (omit asEdge).',
    };
  }
  const optsLiteral = serializeOpts(input);
  const callExpr = `${input.target}.projectCurve(${optsLiteral})`;
  const featureLine = input.bindAs
    ? `const ${input.bindAs} = ${callExpr};`
    : `${callExpr};`;
  return addFeature(input.code, featureLine);
}
