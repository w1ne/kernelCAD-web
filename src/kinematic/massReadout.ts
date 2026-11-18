// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/massReadout.ts
//
// Selection → physical mass readout for one solid or one assembly part.
// Density follows inspect({ of: 'mass' }) for a lone solid (water = 1000,
// flagged, never a silent default; an unknown material is refused). An
// assembly part uses localPartMass, including a declared massKg. An empty
// selection, a multi-selection, or a non-solid stays an empty state — never
// a row of zeros.
import type { ShapeBackend } from '../kernel/backends/backend';
import type { SceneBackendPart } from '../kernel/backends/sceneBackend';
import type { MassProperties } from '../kernel/properties/massProperties';
import type { AssemblyPartStored } from '../modeling/capture/assemblyTypes';
import { tryResolveMaterial } from '../modeling/properties/materialLibrary';
import { localPartMass, resolvePartDensity, DEFAULT_DENSITY } from './partMass';

export const WATER_DENSITY_KG_M3 = DEFAULT_DENSITY;

export type DensitySource = 'raw' | 'material' | 'default';

/** The slice of a shape the readout actually calls. */
export interface MassBody {
  volume(): number;
  massProperties(density?: number): MassProperties;
}

/** Fields localPartMass reads off an assembly part. */
export interface AssemblyPartMassInput {
  readonly name: string;
  readonly density?: number;
  readonly material?: string;
  readonly massKg?: number;
}

export type MassTarget =
  | {
      readonly kind: 'solid';
      readonly label: string;
      readonly body: MassBody;
      readonly density?: number;
      readonly material?: string;
    }
  | {
      readonly kind: 'assemblyPart';
      readonly part: AssemblyPartMassInput;
      readonly body: MassBody;
    }
  | { readonly kind: 'other' };

export interface MassReadoutLine {
  readonly id: 'mass' | 'density' | 'com' | 'principal' | 'volume';
  readonly label: string;
  readonly value: string;
  /** Set when this row is the water default, including when a declared mass did not use it. */
  readonly flag?: 'water-default';
}

export interface MassReadoutReady {
  readonly status: 'ready';
  readonly label: string;
  readonly massKg: number;
  readonly densityKgM3: number;
  readonly densitySource: DensitySource;
  readonly densityDefaulted: boolean;
  readonly material?: string;
  /** True when the mass is `massKg` on the part, not density × volume. */
  readonly massDeclared: boolean;
  readonly comMm: readonly [number, number, number];
  readonly principalMomentsKgM2: readonly [number, number, number];
  readonly inertia6KgM2: readonly [number, number, number, number, number, number];
  readonly inertiaTensorText: string;
  readonly volumeMm3: number;
  readonly warning?: string;
  readonly lines: readonly MassReadoutLine[];
}

export interface MassReadoutEmpty {
  readonly status: 'empty';
  readonly reason: 'no-selection' | 'multi-select' | 'not-a-solid' | 'no-volume';
  readonly message: string;
}

export interface MassReadoutUnavailable {
  readonly status: 'unavailable';
  readonly message: string;
}

export type MassReadout = MassReadoutReady | MassReadoutEmpty | MassReadoutUnavailable;

const NO_SELECTION = 'Select one solid or part to see mass properties.';
const MULTI = 'Select a single solid or part to see mass properties.';
const NOT_SOLID = 'Mass properties are available for one solid or one assembly part.';
const NO_VOLUME = 'This selection has no solid volume.';

function empty(reason: MassReadoutEmpty['reason'], message: string): MassReadoutEmpty {
  return { status: 'empty', reason, message };
}

function unavailable(message: string): MassReadoutUnavailable {
  return { status: 'unavailable', message };
}

/** Ordinary magnitudes stay decimal; tiny inertia values stay exponential. */
export function formatMeasure(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs >= 10000 || abs < 0.001) return sign + abs.toExponential(4);
  return sign + abs.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function waterWarning(unresolvedMaterial?: string): string {
  const lead = unresolvedMaterial !== undefined
    ? `Material '${unresolvedMaterial}' is not a known material, so mass uses the default density ${WATER_DENSITY_KG_M3} kg/m³ (water).`
    : `Mass uses the default density ${WATER_DENSITY_KG_M3} kg/m³ (water).`;
  return `${lead} Assign a material or a density for a real number.`;
}

function densityLine(density: number, source: DensitySource, material?: string): MassReadoutLine {
  const value = source === 'raw'
    ? `${formatMeasure(density)} kg/m³ · raw`
    : source === 'material'
      ? `${formatMeasure(density)} kg/m³ · material (${material ?? 'unknown'})`
      : `${formatMeasure(density)} kg/m³ · default (water)`;
  return {
    id: 'density',
    label: 'Density',
    value,
    ...(source === 'default' ? { flag: 'water-default' as const } : {}),
  };
}

interface Quantities {
  readonly label: string;
  readonly massKg: number;
  readonly massDeclared: boolean;
  readonly densityKgM3: number;
  readonly densitySource: DensitySource;
  readonly material?: string;
  readonly unresolvedMaterial?: string;
  readonly comMm: readonly [number, number, number];
  readonly principalMomentsKgM2: readonly [number, number, number];
  readonly inertia6KgM2: readonly [number, number, number, number, number, number];
  readonly volumeMm3: number;
}

function finish(q: Quantities): MassReadoutReady {
  const densityDefaulted = q.densitySource === 'default' && !q.massDeclared;
  const warning = densityDefaulted ? waterWarning(q.unresolvedMaterial) : undefined;
  const inertiaTensorText = `[${q.inertia6KgM2.map(formatMeasure).join(', ')}] kg·m²`;
  const lines: MassReadoutLine[] = [
    {
      id: 'mass',
      label: 'Mass',
      value: q.massDeclared ? `${formatMeasure(q.massKg)} kg (declared)` : `${formatMeasure(q.massKg)} kg`,
    },
    densityLine(q.densityKgM3, q.densitySource, q.material),
    {
      id: 'com',
      label: 'Center of mass',
      value: `${q.comMm.map(formatMeasure).join(', ')} mm`,
    },
    {
      id: 'principal',
      label: 'Principal moments',
      value: `${q.principalMomentsKgM2.map(formatMeasure).join(', ')} kg·m²`,
    },
    {
      id: 'volume',
      label: 'Volume',
      value: `${formatMeasure(q.volumeMm3)} mm³`,
    },
  ];
  return {
    status: 'ready',
    label: q.label,
    massKg: q.massKg,
    densityKgM3: q.densityKgM3,
    densitySource: q.densitySource,
    densityDefaulted,
    ...(q.material !== undefined ? { material: q.material } : {}),
    massDeclared: q.massDeclared,
    comMm: q.comMm,
    principalMomentsKgM2: q.principalMomentsKgM2,
    inertia6KgM2: q.inertia6KgM2,
    inertiaTensorText,
    volumeMm3: q.volumeMm3,
    ...(warning !== undefined ? { warning } : {}),
    lines,
  };
}

function readVolume(body: MassBody): number | MassReadout {
  try {
    const volume = body.volume();
    if (!Number.isFinite(volume) || volume <= 0) return empty('no-volume', NO_VOLUME);
    return volume;
  } catch (err) {
    return unavailable(err instanceof Error ? err.message : 'Mass properties could not be read.');
  }
}

function solidProvenance(target: Extract<MassTarget, { kind: 'solid' }>):
  | { density: number; densitySource: DensitySource; material?: string }
  | MassReadoutUnavailable {
  if (target.density !== undefined && !(target.density > 0)) {
    return unavailable(`density must be a positive number (kg/m³); got ${target.density}.`);
  }
  if (target.density !== undefined && target.material !== undefined) {
    return unavailable('Pass either density or material, not both — they both set the density.');
  }
  if (target.density !== undefined) return { density: target.density, densitySource: 'raw' };
  if (target.material !== undefined) {
    const resolved = tryResolveMaterial(target.material);
    if (!resolved.ok) {
      return unavailable(resolved.hint ? `${resolved.message} ${resolved.hint}` : resolved.message);
    }
    return {
      density: resolved.material.density,
      densitySource: 'material',
      material: resolved.material.name,
    };
  }
  return { density: WATER_DENSITY_KG_M3, densitySource: 'default' };
}

function fromSolid(target: Extract<MassTarget, { kind: 'solid' }>): MassReadout {
  const volume = readVolume(target.body);
  if (typeof volume !== 'number') return volume;
  const provenance = solidProvenance(target);
  if ('status' in provenance) return provenance;
  let mp: MassProperties;
  try {
    mp = target.body.massProperties(provenance.density);
  } catch (err) {
    return unavailable(err instanceof Error ? err.message : 'Mass properties could not be read.');
  }
  return finish({
    label: target.label,
    massKg: mp.mass,
    massDeclared: false,
    densityKgM3: provenance.density,
    densitySource: provenance.densitySource,
    ...(provenance.material !== undefined ? { material: provenance.material } : {}),
    comMm: mp.com,
    principalMomentsKgM2: mp.principalMoments,
    inertia6KgM2: mp.inertia6,
    volumeMm3: volume,
  });
}

function assemblyProvenance(part: AssemblyPartMassInput): {
  density: number;
  densitySource: DensitySource;
  material?: string;
  unresolvedMaterial?: string;
} {
  const named = part.material !== undefined ? tryResolveMaterial(part.material) : undefined;
  const { density, source } = resolvePartDensity(part as AssemblyPartStored);
  if (source === 'density') return { density, densitySource: 'raw' };
  if (source === 'material' && named?.ok === true) {
    return { density, densitySource: 'material', material: named.material.name };
  }
  if (source === 'material') return { density, densitySource: 'raw' };
  return {
    density,
    densitySource: 'default',
    ...(part.material !== undefined ? { unresolvedMaterial: part.material } : {}),
  };
}

function scaledMoments(
  moments: readonly [number, number, number],
  k: number,
): [number, number, number] {
  return [moments[0] * k, moments[1] * k, moments[2] * k];
}

function fromAssembly(target: Extract<MassTarget, { kind: 'assemblyPart' }>): MassReadout {
  const volume = readVolume(target.body);
  if (typeof volume !== 'number') return volume;
  const provenance = assemblyProvenance(target.part);
  let mp: MassProperties;
  try {
    mp = target.body.massProperties(provenance.density);
  } catch (err) {
    return unavailable(err instanceof Error ? err.message : 'Mass properties could not be read.');
  }
  const scenePart = {
    name: target.part.name,
    shape: target.body as unknown as ShapeBackend,
  } as SceneBackendPart;
  const local = localPartMass(target.part as AssemblyPartStored, scenePart);
  const k = target.part.massKg !== undefined && mp.mass > 0 ? target.part.massKg / mp.mass : 1;
  const matrix = local.inertiaLocal;
  return finish({
    label: target.part.name,
    massKg: local.mass,
    massDeclared: target.part.massKg !== undefined,
    densityKgM3: provenance.density,
    densitySource: provenance.densitySource,
    ...(provenance.material !== undefined ? { material: provenance.material } : {}),
    ...(provenance.unresolvedMaterial !== undefined
      ? { unresolvedMaterial: provenance.unresolvedMaterial }
      : {}),
    comMm: local.comLocalMm,
    principalMomentsKgM2: scaledMoments(mp.principalMoments, k),
    inertia6KgM2: [matrix[0][0], matrix[0][1], matrix[0][2], matrix[1][1], matrix[1][2], matrix[2][2]],
    volumeMm3: volume,
  });
}

/** Map the current selection to a readout. Zero or many ids never become numbers. */
export function massReadoutForIds(
  selectedIds: readonly string[],
  resolve: (id: string) => MassTarget | undefined,
): MassReadout {
  if (selectedIds.length === 0) return empty('no-selection', NO_SELECTION);
  if (selectedIds.length > 1) return empty('multi-select', MULTI);
  const id = selectedIds[0];
  const target = id === undefined ? undefined : resolve(id);
  if (target === undefined || target.kind === 'other') return empty('not-a-solid', NOT_SOLID);
  if (target.kind === 'assemblyPart') return fromAssembly(target);
  return fromSolid(target);
}
