// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/flight/flightBodies.ts
//
// Finds the flight studies a model declares and turns the lowered geometry
// each one is bound to into world-space bodies (mesh, mass, CoM) for the
// flight runner. Shared by the evaluate gate and `run_flight` so both agree
// on which study a script means and what it weighs.
//
// Part mass precedence (same as the static-hold / motion-load checks):
// `massKg` on the part (CoM from the geometry), else volume x density
// (explicit `density`, else the named `material`), else water, flagged.

import type { ShapeBackend } from '../../../kernel/backends/backend';
import { isSceneBackend, type SceneBackend } from '../../../kernel/backends/sceneBackend';
import type { FlightBody } from '../../../kernel/flight/geometry';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FlightStudyMetadata } from '../../../shared/intent/flightStudyRecord';
import type { AssemblyPartStored } from '../../capture/assemblyTypes';
import { tryResolveMaterial } from '../../properties/materialLibrary';

const WATER = 1000;

export interface FoundFlightStudy {
  recordId: string;
  /** Shape the study is bound to (shape.flightStudy). */
  shapeId?: string;
  metadata: FlightStudyMetadata;
}

export function findFlightStudies(records: readonly FeatureRecord[]): FoundFlightStudy[] {
  const out: FoundFlightStudy[] = [];
  for (const r of records) {
    if (r.kind !== 'flightStudy') continue;
    const ref = r.inputs?.shape;
    out.push({
      recordId: r.id,
      ...(ref !== undefined && ref.kind === 'feature' ? { shapeId: ref.id } : {}),
      metadata: r.metadata as unknown as FlightStudyMetadata,
    });
  }
  return out;
}

/** The named study, or the last declared one; undefined when the name matches nothing. */
export function selectFlightStudy(studies: readonly FoundFlightStudy[], name: string | undefined): FoundFlightStudy | undefined {
  if (studies.length === 0) return undefined;
  if (name === undefined) return studies[studies.length - 1];
  return studies.find(s => s.metadata.name === name);
}

function partDensity(p: AssemblyPartStored | undefined): { density: number; source: FlightBody['massSource'] } {
  if (p?.density !== undefined) return { density: p.density, source: p.material !== undefined ? 'material' : 'density' };
  if (p?.material !== undefined) {
    const r = tryResolveMaterial(p.material);
    if (r.ok) return { density: r.material.density, source: 'material' };
  }
  return { density: WATER, source: 'default' };
}

type Point = (p: readonly [number, number, number]) => readonly [number, number, number];

function bodyFrom(name: string, shape: ShapeBackend, toWorld: Point, part: AssemblyPartStored | undefined): FlightBody {
  const { density, source } = partDensity(part);
  const mp = shape.massProperties(density);
  const mesh = shape.getMesh();
  const pos = new Float64Array(mesh.positions.length);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const w = toWorld([mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]]);
    pos[i] = w[0];
    pos[i + 1] = w[1];
    pos[i + 2] = w[2];
  }
  return {
    name,
    positions: pos,
    indices: mesh.indices,
    massKg: part?.massKg ?? mp.mass,
    comMm: toWorld(mp.com as readonly [number, number, number]),
    massSource: part?.massKg !== undefined ? 'massKg' : source,
  };
}

interface PartsSource { __parts(): readonly AssemblyPartStored[] }

function lastScene(shapes: Iterable<ShapeBackend>, assembly: string): SceneBackend | undefined {
  let found: SceneBackend | undefined;
  for (const s of shapes) if (isSceneBackend(s) && s.assemblyName === assembly) found = s;
  return found;
}

export type FlightBodiesResult =
  | { ok: true; bodies: FlightBody[]; partNames: string[] }
  | { ok: false; reason: string };

/**
 * World-space bodies for `study`. `assemblies` is the capture session's
 * assembly map; `shapes` the lowered shapes of the build.
 */
export function flightBodies(
  study: FoundFlightStudy,
  shapes: ReadonlyMap<string, ShapeBackend>,
  assemblies: ReadonlyMap<string, unknown>,
): FlightBodiesResult {
  const asm = study.metadata.assembly;
  if (asm !== undefined) {
    const scene = lastScene(shapes.values(), asm);
    if (scene === undefined) return { ok: false, reason: `assembly '${asm}' was not lowered; return ${asm}.model() from the script` };
    const stored = (assemblies.get(asm) as PartsSource | undefined)?.__parts() ?? [];
    const byName = new Map(stored.map(p => [p.name, p]));
    const bodies = scene.parts.map(p => bodyFrom(p.name, p.shape, v => p.worldTransform.point(v as [number, number, number]), byName.get(p.name)));
    return { ok: true, bodies, partNames: scene.parts.map(p => p.name) };
  }
  const shape = study.shapeId !== undefined ? shapes.get(study.shapeId) : undefined;
  if (shape === undefined || isSceneBackend(shape)) return { ok: false, reason: `the shape '${study.shapeId ?? '?'}' the study is bound to produced no lowered solid` };
  return { ok: true, bodies: [bodyFrom('vehicle', shape, v => v, undefined)], partNames: [] };
}

/** Names a study refers to that are not parts of its assembly. */
export function unresolvedParts(m: FlightStudyMetadata, partNames: readonly string[]): string[] {
  if (m.assembly === undefined) return [];
  const names = [m.motor.part, m.aero.nose.part, m.aero.fins?.part, ...m.recovery.flatMap(r => [r.part, ...r.separates])];
  const have = new Set(partNames);
  return [...new Set(names.filter((n): n is string => n !== undefined && !have.has(n)))];
}
