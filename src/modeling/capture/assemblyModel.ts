// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import { Transform } from '../../shared/runtime/se3';
import type { NumericPoses } from './forwardKinematics';
import type { Connector } from '../mates/connector';
import { expandCoupledPoses } from '../mates/coupledPoses';
import { mateFk, type ResolvedMatePart } from '../mates/solver';
import { parseConnectorRef, type MateRecord } from '../mates/mate';
import { placementFromSceneMotion, resolvedPartAt } from '../mates/partFrame';
import { Scene } from '../validation/scene';
import { applyOverlayExclusions, buildMateMetadata, makeScene } from './assemblySolve';
import type { AssemblyState } from './assemblyState';

/**
 * Records an `assemblyModel` FeatureRecord that captures the parts and
 * (when the assembly declares any `arm.mate(...)` records) the v0.6 mate
 * graph + connectors those mates reference, then returns the capture-time
 * `Scene` view — see `makeScene` in `assemblySolve.ts` for the per-part
 * data and precedence rules.
 */
export function recordModel(state: AssemblyState): Scene {
  if (state.parts.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'assembly.model requires at least one part.',
      undefined,
      'Call assembly.part(name, shape, opts?) before assembly.model().',
    );
  }
  applyOverlayExclusions(state);
  const mateMetadata = state.mates.length > 0 ? buildMateMetadata(state) : undefined;
  const sceneShape = state.session.assemblyModel(state.name, state.parts, mateMetadata);
  return makeScene(state, sceneShape, [], captureMatePlacements(state));
}

/**
 * Keep the capture-time Scene's transforms in step with the assemblyModel
 * lowerer for vector-origin mates. `model()` stays synchronous; topology
 * connectors still need lowered geometry and are resolved by recompute.
 */
function captureMatePlacements(state: AssemblyState): ReadonlyMap<string, Transform> | undefined {
  if (state.mates.length === 0) return undefined;

  const connectorNamesByPart = new Map<string, Set<string>>();
  for (const mate of state.mates) {
    for (const ref of [mate.a, mate.b]) {
      const { partName, connectorName } = parseConnectorRef(ref);
      let names = connectorNamesByPart.get(partName);
      if (names === undefined) {
        names = new Set<string>();
        connectorNamesByPart.set(partName, names);
      }
      names.add(connectorName);
    }
  }

  const resolvedParts: ResolvedMatePart[] = [];
  for (const part of state.parts) {
    const names = connectorNamesByPart.get(part.name);
    const at = resolvedPartAt(part.at, state.session.paramTable);
    const connectors: Connector[] = [];
    for (const connector of part.mateConnectors) {
      if (names === undefined || !names.has(connector.name)) continue;
      // Topology connector origins depend on the lowered part geometry. Leave
      // that case to recompute rather than inventing a capture-time transform.
      if (connector.origin.kind !== 'vec3') return undefined;
      const [x, y, z] = connector.origin.value;
      connectors.push({
        ...connector,
        origin: { kind: 'vec3', value: [x + at[0], y + at[1], z + at[2]] },
      });
    }
    resolvedParts.push({
      id: part.id,
      name: part.name,
      connectors,
    });
  }

  const numericPoses = captureMatePoses(state);
  const expandedPoses = expandCoupledPoses(state.mates, state.mateCouplings, numericPoses, {
    resolveSourcePose: (mate) => captureMatePose(mate, state),
  });
  const sceneMotions = mateFk(resolvedParts, state.mates, expandedPoses, { loopModes: state.loopModes });
  const sceneMotionByPartId = new Map<string, Transform>();
  for (const part of state.parts) {
    if (!connectorNamesByPart.has(part.name)) continue;
    const motion = sceneMotions.get(part.id);
    if (motion !== undefined) sceneMotionByPartId.set(part.id, motion);
  }

  // A part positioned with `connect` inherits the solved motion of its
  // parent. Walk repeatedly so a connected chain follows the same FK as the
  // lowerer's assemblyModel scene.
  let propagated = true;
  while (propagated) {
    propagated = false;
    for (const part of state.parts) {
      if (sceneMotionByPartId.has(part.id) || part.connectParentId === undefined) continue;
      const parentMotion = sceneMotionByPartId.get(part.connectParentId);
      if (parentMotion === undefined) continue;
      sceneMotionByPartId.set(part.id, parentMotion);
      propagated = true;
    }
  }

  const placements = new Map<string, Transform>();
  for (const part of state.parts) {
    const motion = sceneMotionByPartId.get(part.id);
    if (motion === undefined) continue;
    const at = resolvedPartAt(part.at, state.session.paramTable);
    placements.set(part.name, placementFromSceneMotion(motion, at));
  }
  return placements;
}

function captureMatePoses(state: AssemblyState): NumericPoses {
  const poses: NumericPoses = {};
  for (const mate of state.mates) {
    const pose = captureMatePose(mate, state);
    if (pose !== undefined) poses[mate.name] = pose;
  }
  return poses;
}

function captureMatePose(mate: MateRecord, state: AssemblyState): number | [number, number, number] | undefined {
  if (mate.type === 'fastened' || mate.type === 'planar') return undefined;
  if (mate.pose === undefined) return mate.type === 'ball' ? [0, 0, 0] : 0;
  if (Array.isArray(mate.pose)) {
    return mate.pose.map((value) => currentValue(value as Editable<number>, state.session.paramTable)) as [number, number, number];
  }
  return currentValue(mate.pose as Editable<number>, state.session.paramTable);
}
