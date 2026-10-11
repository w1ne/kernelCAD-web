// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Port report: where every fluid port of the built assembly is. A script
// cannot read a port position itself (a part placed by a param has
// `at.evaluated: 0` at capture time, and a mate moves the part after `at`),
// so the evaluation result lists them: assembly space, params resolved, the
// mate solver's pose applied, and the tubes that end on each port.
//
// The positions come from the same scene resolution the tube gates use
// (`tubeSceneContext`, `partFrameInWorld`). A port whose position cannot be
// stated is still listed, with `unresolved` saying why and no `origin`: a
// guessed position would be read as fact.

import type { BuiltModel } from '../../buildModel';
import type { Assembly } from '../../capture/assembly';
import type { AssemblyPartStored } from '../../capture/assemblyTypes';
import type { Connector } from '../../mates/connector';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { isTubeMetadata, type TubeMetadata } from '../../../shared/intent/tubeRecord';
import type { Transform } from '../../../shared/runtime/se3';
import { add, norm, sub, unit, type V3 } from '../../../shared/tube/tubePath';
import {
  endsOf, partAt, partFrameInWorld, PORT_POSITION_TOL_MM, resolveTube, scenePartOf, tubeSceneContext,
  type ResolvedTube, type TubeSceneContext,
} from './tubeScene';

export interface PortReportEntry {
  /** The assembly part that owns the port, and the connector name. */
  part: string;
  name: string;
  system: string;
  /** Tube outer diameter the port takes, mm. */
  od: number;
  /** Straight a tube must keep leaving the port, mm; absent when the port declares none. */
  minStraight?: number;
  /** Port position in assembly space, mm. Absent when `unresolved` is set. */
  origin?: V3;
  /** Unit axis pointing out of the part, assembly space. Absent when `unresolved` is set. */
  axis?: V3;
  /** `at`: the part is where its `at` puts it. `connect`: the part is where
   *  its `connect` puts it. `mate`: the solve moved or turned the part after
   *  that, and `origin` / `axis` are the solved ones. */
  placedBy?: 'at' | 'connect' | 'mate';
  /** Names of the tubes that end on the port; empty when it is free. */
  usedBy: string[];
  /** Why the position is missing. Absent when `origin` is given. */
  unresolved?: string;
}

const NO_SCENE = 'no built assembly: the build failed, or the script does not return this assembly';
const IDENTITY_TOL = 1e-9;

/** Kernel noise off, and no negative zero in the JSON. */
const tidy = (v: readonly number[]): V3 => v.map((n) => Math.round(n * 1e6) / 1e6 + 0) as V3;

function isIdentity(t: Transform): boolean {
  const frame: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return norm(t.point([0, 0, 0]) as V3) <= IDENTITY_TOL &&
    frame.every((e) => norm(sub(t.axisDir(e) as V3, e)) <= IDENTITY_TOL);
}

type Placed = Pick<PortReportEntry, 'origin' | 'axis' | 'placedBy'> | { unresolved: string };

/** The connector's point and axis in its part's own frame, or why they are not fixed numbers. */
function localFrame(connector: Connector): { origin: V3; axis: V3 } | { unresolved: string } {
  if (connector.origin.kind !== 'vec3') {
    return { unresolved: 'the connector origin is a face, edge or vertex reference, not a fixed point' };
  }
  const local = connector.origin.value as readonly unknown[];
  if (local.length !== 3 || !local.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return { unresolved: 'the connector origin is not three finite numbers' };
  }
  return { origin: [...connector.origin.value] as V3, axis: [...(connector.axis ?? [0, 0, 1])] as V3 };
}

/** Where the port is in the solved scene, or why that cannot be stated. */
function placeInScene(model: BuiltModel, ctx: TubeSceneContext, stored: AssemblyPartStored, connector: Connector): Placed {
  const scenePart = scenePartOf(ctx, stored.name);
  if (scenePart === undefined) return { unresolved: `part '${stored.name}' is not in the built assembly` };
  const local = localFrame(connector);
  if ('unresolved' in local) return local;
  // A part placed with `connect` has an `at` like any other: capture works it
  // out from the two connectors, the built shape carries it, and the solve's
  // pose goes on top. So one formula covers both, and only the label differs.
  const world = partFrameInWorld(model, stored, scenePart, local.origin, local.axis);
  const unmoved = stored.connectParentId !== undefined ? 'connect' : 'at';
  return {
    origin: tidy(world.origin),
    axis: tidy(world.axis),
    placedBy: isIdentity(scenePart.worldTransform) ? unmoved : 'mate',
  };
}

/** An assembly the script asked for (`model()` / `solvedModel()`) that did
 *  not build. Its parts are still known from the script: which of them built,
 *  and which of them the solve would have positioned. */
interface UnbuiltAssembly {
  /** Names of the parts whose own shape did not build. */
  failed: ReadonlySet<string>;
  /** The parts the solve positions, by name: what refers to each. A part with
   *  both reads `mate`, as the mate's pose is the one a built scene keeps. */
  solved: ReadonlyMap<string, 'mate' | 'joint'>;
}

const SCENE_KINDS: readonly string[] = ['assemblyModel', 'solvedAssembly'];

/** Undefined when the script never builds the assembly: nothing says its
 *  parts were meant to be where `at` puts them. */
function unbuiltAssembly(model: BuiltModel, assembly: Assembly): UnbuiltAssembly | undefined {
  const asked = model.records.some((r) => SCENE_KINDS.includes(r.kind) && !r.suppressed &&
    (r.metadata as { assemblyName?: unknown } | undefined)?.assemblyName === assembly.name);
  if (!asked) return undefined;
  const parts = assembly.__parts();
  const nameOf = new Map(parts.map((p) => [p.id, p.name]));
  const mated = assembly.__mates().flatMap((m) => [m.a, m.b]).map((ref) => ref.slice(0, Math.max(0, ref.indexOf('.'))));
  const jointed = assembly.__joints().flatMap((j) => [j.parentPartId, j.childPartId]).flatMap((id) => nameOf.get(id) ?? []);
  return {
    failed: new Set(parts.filter((p) => model.shapes.get(p.id) === undefined).map((p) => p.name)),
    solved: new Map<string, 'mate' | 'joint'>([
      ...jointed.map((n) => [n, 'joint'] as const), ...mated.map((n) => [n, 'mate'] as const)]),
  };
}

/** Where the port is when the assembly did not build. A part placed with `at`
 *  that no mate or joint refers to is where `at` puts it, solve or no solve;
 *  any other part's position is the solve's to give, and it did not run. */
function placeWithoutScene(model: BuiltModel, unbuilt: UnbuiltAssembly, stored: AssemblyPartStored, connector: Connector): Placed {
  if (unbuilt.failed.has(stored.name)) return { unresolved: `part '${stored.name}' failed to build` };
  const local = localFrame(connector);
  if ('unresolved' in local) return local;
  const failed = [...unbuilt.failed].map((n) => `'${n}'`);
  const why = failed.length === 0 ? '' : ` (part${failed.length > 1 ? 's' : ''} ${failed.join(', ')} failed to build)`;
  const notSolved = `the assembly was not built${why}, so the solve did not run; part '${stored.name}'`;
  if (stored.connectParentId !== undefined) return { unresolved: `${notSolved} is placed with connect` };
  const by = unbuilt.solved.get(stored.name);
  if (by !== undefined) return { unresolved: `${notSolved} is positioned by a ${by}` };
  return { origin: tidy(add(partAt(model, stored), local.origin)), axis: tidy(unit(local.axis)), placedBy: 'at' };
}

interface TubeOnScene { meta: TubeMetadata; resolved?: ResolvedTube }

function tubesOf(model: BuiltModel, ctx: TubeSceneContext): TubeOnScene[] {
  return model.records.filter((r: FeatureRecord) => r.kind === 'tube' && !r.suppressed).flatMap((r) => {
    const meta = (r.metadata as { tube?: unknown } | undefined)?.tube;
    if (!isTubeMetadata(meta)) return [];
    // A tube that cannot be resolved is still matched to its ports by name; the gate reports why.
    let resolved: ResolvedTube | undefined;
    try {
      resolved = resolveTube(model, ctx, r)[0];
    } catch {
      resolved = undefined;
    }
    return [resolved !== undefined ? { meta, resolved } : { meta }];
  });
}

/** A tube ends on the port when an end names it (`part.port(name)`), or when a
 *  plain end sits at the port's position: the way to route to a port that
 *  `part.port` cannot give, such as one on a part moved by a mate. A plain end
 *  that names another part belongs to that part, wherever it sits. */
function endsOnPort(tube: TubeOnScene, part: string, name: string, origin: V3 | undefined): boolean {
  if ([tube.meta.from, tube.meta.to].some((e) => e.part === part && e.connector === name)) return true;
  const placement = tube.resolved?.placement;
  if (origin === undefined || tube.resolved === undefined || placement === undefined) return false;
  return endsOf(tube.resolved).some((e) => e.meta.connector === undefined &&
    (e.meta.part === undefined || e.meta.part === part) &&
    norm(sub(placement.point(e.captured) as V3, origin)) <= PORT_POSITION_TOL_MM);
}

/**
 * Every fluid port of the model's assembly: the assembly the script returns,
 * or, when no assembly was built, every assembly the script declares. With
 * no built assembly a port has a position only on a part placed with `at`
 * that no mate or joint refers to, in an assembly the script asked for; every
 * other port is `unresolved`. Returns `undefined` when the script declares no
 * assembly, and `[]` when its assembly has no ports. Runs on a failed build
 * too; it reads the model and never changes it.
 */
export function portReportOnModel(model: BuiltModel): PortReportEntry[] | undefined {
  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  if (assemblies.length === 0) return undefined;
  const ctx = tubeSceneContext(model);
  const scene = ctx.scene;
  const reported = scene === undefined ? assemblies : assemblies.filter((a) => a.name === scene.assemblyName);
  const tubes = tubesOf(model, ctx);
  const unbuilt = new Map(scene === undefined ? assemblies.map((a) => [a, unbuiltAssembly(model, a)]) : []);
  const place = (a: Assembly, stored: AssemblyPartStored, connector: Connector): Placed => {
    if (scene !== undefined) return placeInScene(model, ctx, stored, connector);
    const known = unbuilt.get(a);
    return known === undefined ? { unresolved: NO_SCENE } : placeWithoutScene(model, known, stored, connector);
  };
  return reported.flatMap((a) => a.__parts().map((stored) => ({ a, stored }))).flatMap(({ a, stored }) =>
    stored.mateConnectors.flatMap((connector): PortReportEntry[] => {
      const port = connector.port;
      if (port === undefined) return [];
      const placed = place(a, stored, connector);
      const origin = 'unresolved' in placed ? undefined : placed.origin;
      return [{
        part: stored.name,
        name: connector.name,
        system: port.system,
        od: port.od,
        ...(port.minStraight !== undefined ? { minStraight: port.minStraight } : {}),
        ...placed,
        usedBy: tubes.filter((t) => endsOnPort(t, stored.name, connector.name, origin)).map((t) => t.meta.name),
      }];
    }));
}
