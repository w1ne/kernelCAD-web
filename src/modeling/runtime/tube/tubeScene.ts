// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Where the tubes of a built model are: each `tube` record resolved through
// the param table to its path, its lowered shape and the rigid placement that
// takes the captured path to the world, plus the check that every tube end
// still sits on its port (or on the point it was captured at).
//
// Frames. A tube is captured in assembly space: a port end is the owning
// part's `at` plus the connector origin. A scene part's shape already carries
// its `at`; `worldTransform` is what the mate solver adds on top. So a point
// fixed to a part is `worldTransform.point(at + local)`.

import type { BuiltModel } from '../../buildModel';
import type { Assembly } from '../../capture/assembly';
import type { AssemblyPartStored } from '../../capture/assemblyTypes';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend, type SceneBackendPart } from '../../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics/registry';
import type { FeatureRecord, ShapeTransform } from '../../../shared/intent/featureRecord';
import { isTubeMetadata, tubeCornerPoints, type TubeEndMeta, type TubeMetadata } from '../../../shared/intent/tubeRecord';
import type { FeatureId, Vec3Param } from '../../../shared/intent/types';
import { resolveParams } from '../../../shared/runtime/resolveParams';
import { Transform } from '../../../shared/runtime/se3';
import { add, buildTubePath, isTubePathError, norm, scale, sub, unit, type TubePath, type V3 } from '../../../shared/tube/tubePath';
import { angleDeg, mm2, PORT_AXIS_TOL_DEG, xyz2 } from './tubeRules';

type TubeCode = Extract<keyof typeof DIAGNOSTIC_REGISTRY, `tube.${string}`>;

/** A tube end further than this from its port (or captured point) is off it. */
const PORT_POSITION_TOL_MM = 0.01;

export interface ResolvedTube {
  id: FeatureId;
  name: string;
  path: TubePath;
  od: number;
  wall: number;
  meta: TubeMetadata;
  /** The lowered tube as built (assembly space, record transforms applied);
   *  undefined when lowering failed. */
  shape?: OcctBackend;
  /** The scene part that carries this tube, when it was added to the assembly. */
  scenePart?: SceneBackendPart;
  /** Captured path → world. Undefined when the tube was scaled or mirrored
   *  after routing: no rigid motion describes where it is. */
  placement?: Transform;
}

export interface TubeSceneContext {
  scene?: SceneBackend;
  /** Stored assembly parts of the scene's assembly, by part name. */
  stored: ReadonlyMap<string, AssemblyPartStored>;
  /** Scene part names that carry a tube. */
  tubePartNames: ReadonlySet<string>;
}

/** A tube diagnostic from a complete message (`<code>: ...`), with the
 *  registry's severity, hint and next action. */
export function tubeDiagnosticFromMessage(code: TubeCode, message: string, featureId?: FeatureId): CompilerDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    target: 'export-occt',
    code,
    ...(featureId !== undefined ? { featureId } : {}),
    severity: entry.defaultSeverity,
    message,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
  };
}

export function tubeDiagnostic(code: TubeCode, text: string, featureId?: FeatureId): CompilerDiagnostic {
  return tubeDiagnosticFromMessage(code, `${code}: ${text}`, featureId);
}

/** The scene the model resolves to (the LAST record lowered to a
 *  SceneBackend, as the DFM gate does) and its assembly's stored parts. */
export function tubeSceneContext(model: BuiltModel): TubeSceneContext {
  const tubeIds = new Set(model.records.filter((r) => r.kind === 'tube').map((r) => r.id));
  for (let i = model.records.length - 1; i >= 0; i--) {
    const scene = model.shapes.get(model.records[i].id);
    if (!isSceneBackend(scene)) continue;
    const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
    const parts = assemblies.find((a) => a.name === scene.assemblyName)?.__parts() ?? [];
    const inScene = new Set(scene.parts.map((p) => p.name));
    const stored = new Map(parts.filter((p) => inScene.has(p.name)).map((p) => [p.name, p]));
    const tubePartNames = new Set(parts.filter((p) => tubeIds.has(p.originalShape.id)).map((p) => p.name));
    return { scene, stored, tubePartNames };
  }
  return { stored: new Map(), tubePartNames: new Set() };
}

const vec = (p: Vec3Param): V3 => [p.x.evaluated, p.y.evaluated, p.z.evaluated];

/** One post-hoc shape transform as a rigid motion; undefined for scale and
 *  mirror. The record is already resolved, so `evaluated` is current. */
function rigidTransform(t: ShapeTransform): Transform | undefined {
  if (t.op === 'translate') return Transform.translation(...vec(t.vec));
  if (t.op === 'rotateAxis') {
    return Transform.rotationAroundPivot(vec(t.axis), t.degrees.evaluated, t.pivot ? vec(t.pivot) : [0, 0, 0]);
  }
  return undefined;
}

/** Captured path → world: the record's own transforms in declared order,
 *  then the carrying scene part's `at` and solved pose. */
function tubePlacement(
  transforms: readonly ShapeTransform[], carrier: { at: V3; pose: Transform } | undefined,
): Transform | undefined {
  let total = Transform.identity();
  for (const t of transforms) {
    const next = rigidTransform(t);
    if (next === undefined) return undefined;
    total = next.compose(total);
  }
  if (carrier === undefined) return total;
  return carrier.pose.compose(Transform.translation(...carrier.at)).compose(total);
}

/** Resolve one `tube` record. Params and metadata go through the param table
 *  first: a captured Param that references a script parameter has
 *  `evaluated: 0`. Returns [] when the path cannot be built (the lowerer has
 *  already reported it). */
export function resolveTube(model: BuiltModel, ctx: TubeSceneContext, record: FeatureRecord): ResolvedTube[] {
  const table = model.session.paramTable;
  const r = resolveParams(record, table);
  const meta = (r.metadata as { tube?: unknown } | undefined)?.tube;
  if (!isTubeMetadata(meta)) return [];
  const path = buildTubePath(tubeCornerPoints(meta), r.params.bendRadius.evaluated);
  if (isTubePathError(path)) return [];
  const stored = [...ctx.stored.values()].find((p) => p.originalShape.id === record.id);
  const scenePart = stored === undefined ? undefined : ctx.scene?.parts.find((p) => p.name === stored.name);
  const carrier = stored === undefined || scenePart === undefined ? undefined :
    { at: vec(resolveParams(stored.at, table)), pose: scenePart.worldTransform };
  return [{
    id: record.id,
    name: meta.name,
    path,
    od: r.params.od.evaluated,
    wall: r.params.wall.evaluated,
    meta,
    shape: model.shapes.get(record.id) as OcctBackend | undefined,
    ...(scenePart !== undefined ? { scenePart } : {}),
    placement: tubePlacement(r.transforms, carrier),
  }];
}

interface WorldPort { label: string; origin: V3; axis: V3 }

/** Where a port is now: the connector on the owning part, carried by the
 *  part's solved pose. Undefined when the end is a plain point or its part is
 *  not in the scene. */
function worldPort(model: BuiltModel, ctx: TubeSceneContext, end: TubeEndMeta): WorldPort | undefined {
  if (end.part === undefined || end.connector === undefined) return undefined;
  const stored = ctx.stored.get(end.part);
  const scenePart = ctx.scene?.parts.find((p) => p.name === end.part);
  const connector = stored?.mateConnectors.find((c) => c.name === end.connector);
  if (stored === undefined || scenePart === undefined || connector === undefined || connector.origin.kind !== 'vec3') {
    return undefined;
  }
  const at = vec(resolveParams(stored.at, model.session.paramTable));
  const local = add(at, [...connector.origin.value] as V3);
  const axis = [...(connector.axis ?? [0, 0, 1])] as V3;
  return {
    label: `${end.part}.${end.connector}`,
    origin: scenePart.worldTransform.point(local) as V3,
    axis: unit(scenePart.worldTransform.axisDir(axis) as V3),
  };
}

interface TubeEndState { which: 'from' | 'to'; meta: TubeEndMeta; captured: V3; leaving: V3 }

function endsOf(tube: ResolvedTube): TubeEndState[] {
  const { points, startDir, endDir } = tube.path;
  return [
    { which: 'from', meta: tube.meta.from, captured: points[0], leaving: startDir },
    { which: 'to', meta: tube.meta.to, captured: points[points.length - 1], leaving: scale(endDir, -1) },
  ];
}

function endPositionText(tube: ResolvedTube, placement: Transform, end: TubeEndState, port: WorldPort | undefined): string | undefined {
  const at = placement.point(end.captured) as V3;
  if (port === undefined) {
    const gap = norm(sub(at, end.captured));
    return gap <= PORT_POSITION_TOL_MM ? undefined :
      `tube '${tube.name}' ${end.which} end is ${mm2(gap)} mm from its captured point ${xyz2(end.captured)}; ` +
      'the tube was moved after it was routed.';
  }
  const gap = norm(sub(at, port.origin));
  if (gap > PORT_POSITION_TOL_MM) {
    return `tube '${tube.name}' ${end.which} end is ${mm2(gap)} mm from port '${port.label}'; ` +
      `the port is at ${xyz2(port.origin)}.`;
  }
  // An end leg already off the captured port axis is reported by the path rules.
  const reported = end.meta.axis !== undefined && angleDeg(end.leaving, end.meta.axis) > PORT_AXIS_TOL_DEG;
  const off = angleDeg(unit(placement.axisDir(end.leaving) as V3), port.axis);
  return reported || off <= PORT_AXIS_TOL_DEG ? undefined :
    `tube '${tube.name}' leaves port '${port.label}' ${mm2(off)} deg off the port axis; the part turned.`;
}

/** A plain end may name the part it sits on. A name the scene does not have
 *  would leave the end with no fitting zone and no message saying why. */
export function checkEndParts(ctx: TubeSceneContext, tubes: readonly ResolvedTube[]): CompilerDiagnostic[] {
  const names = ctx.scene?.parts.map((p) => `'${p.name}'`).join(', ');
  const out: CompilerDiagnostic[] = [];
  for (const tube of tubes) {
    for (const { which, meta } of endsOf(tube)) {
      if (meta.part === undefined || ctx.scene?.parts.some((p) => p.name === meta.part)) continue;
      const why = names === undefined ? 'but the script returns no assembly' :
        `which is not a part of the assembly; its parts are ${names}`;
      out.push(tubeDiagnostic('tube.end.part-not-found',
        `tube '${tube.name}' ${which} end names part '${meta.part}', ${why}.`, tube.id));
    }
  }
  return out;
}

/** Every tube end must still sit on its port, or on its captured point when
 *  it has no port. A mate that moves the port's part, or a tube moved in the
 *  assembly, leaves the end hanging. */
export function checkPortPositions(
  model: BuiltModel, ctx: TubeSceneContext, tubes: readonly ResolvedTube[],
): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  for (const tube of tubes) {
    const placement = tube.placement;
    if (placement === undefined) {
      out.push(tubeDiagnostic('tube.port.misaligned',
        `tube '${tube.name}' was scaled or mirrored after it was routed; its ends are no longer on its ports.`, tube.id));
      continue;
    }
    for (const end of endsOf(tube)) {
      const text = endPositionText(tube, placement, end, worldPort(model, ctx, end.meta));
      if (text !== undefined) out.push(tubeDiagnostic('tube.port.misaligned', text, tube.id));
    }
  }
  return out;
}
