// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/assemblyTendonRoute.ts
//
// Capture-time validation for the routed / actuated / strap options of
// `arm.tendon(...)`: `via` route entries, `actuator`, `strapWidthMm` /
// `strapWidthAxis`, `material` and `texture`. Split out of
// `assemblyJoints.ts` (complexity budget); the spring / coil / endpoint
// checks stay there.

import { KernelError } from '../../shared/intent/kernelError';
import { formatScalarForError } from '../../shared/intent/types';
import type { Vec3 } from '../../shared/intent/types';
import { parseConnectorRef } from '../mates/mate';
import {
  TENDON_DEFAULT_STRAP_WIDTH_AXIS,
  TENDON_DEFAULT_STRAP_WIDTH_MM,
  type TendonActuator,
  type TendonMaterial,
  type TendonOptions,
  type TendonTexture,
  type TendonViaRef,
  type TendonWrapRef,
} from '../mates/tendon';
import type { AssemblyState } from './assemblyState';

function bad(name: string, code: string, detail: string, hint: string): KernelError {
  return new KernelError(
    'feature.invalid-args',
    `assembly.tendon.${code}: tendon '${name}' ${detail}`,
    undefined,
    `invalid-args.assembly.tendon-${code} — ${hint}`,
  );
}

function resolveViaConnector(state: AssemblyState, name: string, index: number, ref: string): void {
  let parsed: { partName: string; connectorName: string };
  try {
    parsed = parseConnectorRef(ref);
  } catch {
    throw bad(name, 'connector-not-found', `via[${index}]: '${ref}' is not a 'partName.connectorName' reference.`,
      `pass via entries as '<partName>.<connectorName>' or { wrap: { partName, wrapName } }.`);
  }
  const part = state.parts.find((p) => p.name === parsed.partName);
  if (part === undefined) {
    throw bad(name, 'connector-not-found', `via[${index}]: part '${parsed.partName}' is not declared on assembly '${state.name}'.`,
      `declare the part via arm.part('${parsed.partName}', ...) before routing a tendon through it.`);
  }
  if (!part.mateConnectors.some((c) => c.name === parsed.connectorName)) {
    throw bad(name, 'connector-not-found', `via[${index}]: connector '${parsed.connectorName}' is not declared on part '${parsed.partName}'.`,
      `register the connector via partRef.connector('${parsed.connectorName}', { type, origin, ... }) before routing a tendon through it.`);
  }
}

function resolveViaWrap(state: AssemblyState, name: string, index: number, w: TendonWrapRef): TendonWrapRef {
  const part = state.parts.find((p) => p.name === w?.partName);
  const wg = part?.wrapGeoms.find((g) => g.name === w?.wrapName);
  if (part === undefined || wg === undefined) {
    throw bad(name, 'unknown-wrap-geom', `via[${index}] wrap '${w?.partName}.${w?.wrapName}' is not a declared wrap geom.`,
      `declare it first with arm.part('<part>', ...).wrapGeom('<name>', { axis, radius }), then reference it here.`);
  }
  return {
    partName: w.partName,
    wrapName: w.wrapName,
    ...(w.sidesite !== undefined ? { sidesite: [w.sidesite[0], w.sidesite[1], w.sidesite[2]] as const } : {}),
  };
}

/** Validate + normalise `opts.via`. Rejects the legacy `wrapGeoms` combo. */
export function resolveTendonVia(state: AssemblyState, name: string, opts: TendonOptions): TendonViaRef[] {
  if (opts.via === undefined) return [];
  if (opts.wrapGeoms !== undefined && opts.wrapGeoms.length > 0) {
    throw bad(name, 'via-with-wrap-geoms', `combines 'via' with 'wrapGeoms'.`,
      `put the wrap cylinders into via as { wrap: { partName, wrapName } } entries, in routing order, and drop wrapGeoms.`);
  }
  if (!Array.isArray(opts.via)) {
    throw bad(name, 'invalid-via', `via must be an array; got ${formatScalarForError(opts.via as unknown as number)}.`,
      `pass via: ['part.connector', { wrap: { partName, wrapName } }, ...].`);
  }
  return opts.via.map((v, i): TendonViaRef => {
    if (typeof v === 'string') {
      resolveViaConnector(state, name, i, v);
      return v;
    }
    if (typeof v === 'object' && v !== null && typeof v.wrap === 'object') {
      return { wrap: resolveViaWrap(state, name, i, v.wrap) };
    }
    throw bad(name, 'invalid-via', `via[${i}] must be a 'part.connector' string or { wrap: {...} }.`,
      `pass via: ['part.connector', { wrap: { partName, wrapName } }, ...].`);
  });
}

export function normalizeTendonActuator(name: string, opts: TendonOptions): TendonActuator | undefined {
  if (opts.actuator === undefined) return undefined;
  const f = opts.actuator.maxForceN;
  if (typeof f !== 'number' || !Number.isFinite(f) || f <= 0) {
    throw bad(name, 'invalid-actuator', `actuator.maxForceN must be a positive finite number; got ${formatScalarForError(f)}.`,
      `pass actuator: { maxForceN: <positive N> }.`);
  }
  return { maxForceN: f };
}

export function normalizeTendonStrap(name: string, opts: TendonOptions): { widthMm: number; widthAxis: Vec3 } {
  const widthMm = opts.strapWidthMm ?? TENDON_DEFAULT_STRAP_WIDTH_MM;
  if (!Number.isFinite(widthMm) || widthMm <= 0) {
    throw bad(name, 'invalid-strap-width', `strapWidthMm must be a positive finite number; got ${formatScalarForError(widthMm)}.`,
      `pass strapWidthMm: <positive mm>, or omit it to default to ${TENDON_DEFAULT_STRAP_WIDTH_MM} mm.`);
  }
  const a = opts.strapWidthAxis ?? TENDON_DEFAULT_STRAP_WIDTH_AXIS;
  if (!Array.isArray(a) || a.length !== 3 || a.some((x) => !Number.isFinite(x)) || Math.hypot(a[0], a[1], a[2]) === 0) {
    throw bad(name, 'invalid-strap-axis', `strapWidthAxis must be a finite non-zero [x, y, z].`,
      `pass strapWidthAxis: [0, 1, 0] (expressed in each route point's part frame), or omit it.`);
  }
  return { widthMm, widthAxis: [a[0], a[1], a[2]] };
}

export function normalizeTendonLook(
  name: string,
  opts: TendonOptions,
): { material?: TendonMaterial; texture?: TendonTexture } {
  const out: { material?: TendonMaterial; texture?: TendonTexture } = {};
  const m = opts.material;
  if (m !== undefined) {
    if (typeof m.baseColor !== 'string' || m.baseColor.length === 0) {
      throw bad(name, 'invalid-material', `material.baseColor must be a non-empty color string.`,
        `pass material: { baseColor: '#c9b037', metalness?, roughness? }.`);
    }
    const clamp = (v: number | undefined): number | undefined =>
      v === undefined || !Number.isFinite(v) ? undefined : Math.min(1, Math.max(0, v));
    const metalness = clamp(m.metalness);
    const roughness = clamp(m.roughness);
    out.material = {
      baseColor: m.baseColor,
      ...(metalness !== undefined ? { metalness } : {}),
      ...(roughness !== undefined ? { roughness } : {}),
    };
  }
  const t = opts.texture;
  if (t !== undefined) {
    if (typeof t.path !== 'string' || t.path.length === 0) {
      throw bad(name, 'invalid-texture', `texture.path must be a non-empty string.`,
        `pass texture: { path: 'data:image/png;base64,...' | 'https://...' | '<asset path>', periodMm? }.`);
    }
    if (t.periodMm !== undefined && (!Number.isFinite(t.periodMm) || t.periodMm <= 0)) {
      throw bad(name, 'invalid-texture', `texture.periodMm must be a positive finite number; got ${formatScalarForError(t.periodMm)}.`,
        `pass texture.periodMm: <positive mm of arc length per tile>.`);
    }
    out.texture = { path: t.path, ...(t.periodMm !== undefined ? { periodMm: t.periodMm } : {}) };
  }
  return out;
}
