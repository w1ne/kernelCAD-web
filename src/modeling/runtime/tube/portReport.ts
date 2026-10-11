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
import { norm, sub, type V3 } from '../../../shared/tube/tubePath';
import {
  endsOf, partFrameInWorld, PORT_POSITION_TOL_MM, resolveTube, scenePartOf, tubeSceneContext,
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
  /** `at`: the part is where its `at` puts it. `mate`: a mate moved or turned
   *  the part after `at`, and `origin` / `axis` are the solved ones. */
  placedBy?: 'at' | 'mate';
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

/** Where the port is in the solved scene, or why that cannot be stated. */
function placePort(model: BuiltModel, ctx: TubeSceneContext, stored: AssemblyPartStored, connector: Connector): Placed {
  if (ctx.scene === undefined) return { unresolved: NO_SCENE };
  const scenePart = scenePartOf(ctx, stored.name);
  if (scenePart === undefined) return { unresolved: `part '${stored.name}' is not in the built assembly` };
  if (connector.origin.kind !== 'vec3') {
    return { unresolved: 'the connector origin is a face, edge or vertex reference, not a fixed point' };
  }
  const local = connector.origin.value as readonly unknown[];
  if (local.length !== 3 || !local.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return { unresolved: 'the connector origin is not three finite numbers' };
  }
  if (stored.connectParentId !== undefined) return { unresolved: 'the part is placed with connect, not with at' };
  const world = partFrameInWorld(model, stored, scenePart, [...connector.origin.value] as V3,
    [...(connector.axis ?? [0, 0, 1])] as V3);
  return {
    origin: tidy(world.origin),
    axis: tidy(world.axis),
    placedBy: isIdentity(scenePart.worldTransform) ? 'at' : 'mate',
  };
}

interface TubeOnScene { meta: TubeMetadata; resolved?: ResolvedTube }

function tubesOf(model: BuiltModel, ctx: TubeSceneContext): TubeOnScene[] {
  return model.records.filter((r: FeatureRecord) => r.kind === 'tube' && !r.suppressed).flatMap((r) => {
    const meta = (r.metadata as { tube?: unknown } | undefined)?.tube;
    if (!isTubeMetadata(meta)) return [];
    const resolved = resolveTube(model, ctx, r)[0];
    return [resolved !== undefined ? { meta, resolved } : { meta }];
  });
}

/** A tube ends on the port when an end names it (`part.port(name)`), or when a
 *  plain end sits at the port's position: the way to route to a port that
 *  `part.port` cannot give, such as one on a part moved by a mate. */
function endsOnPort(tube: TubeOnScene, part: string, name: string, origin: V3 | undefined): boolean {
  if ([tube.meta.from, tube.meta.to].some((e) => e.part === part && e.connector === name)) return true;
  const placement = tube.resolved?.placement;
  if (origin === undefined || tube.resolved === undefined || placement === undefined) return false;
  return endsOf(tube.resolved).some((e) => e.meta.connector === undefined &&
    norm(sub(placement.point(e.captured) as V3, origin)) <= PORT_POSITION_TOL_MM);
}

/**
 * Every fluid port of the model's assembly: the assembly the script returns,
 * or, when no assembly was built, every assembly the script declares (each
 * port then `unresolved`). Returns `undefined` when the script declares no
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
  return reported.flatMap((a) => a.__parts()).flatMap((stored) =>
    stored.mateConnectors.flatMap((connector): PortReportEntry[] => {
      const port = connector.port;
      if (port === undefined) return [];
      const placed = placePort(model, ctx, stored, connector);
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
