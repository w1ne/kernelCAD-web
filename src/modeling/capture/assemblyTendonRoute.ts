// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/assemblyTendonRoute.ts
//
// Capture-time validation for the routed / actuated options of
// `arm.tendon(...)`: `via` route entries, `actuator` and `profile`. Split out of
// `assemblyJoints.ts` (complexity budget); the spring / coil / endpoint
// checks stay there.

import type { KernelError } from '../../shared/intent/kernelError';
import { invalidArgsError } from '../../shared/intent/invalidArgs';
import { formatScalarForError } from '../../shared/intent/types';
import type { Vec3 } from '../../shared/intent/types';
import { parseConnectorRef } from '../mates/mate';
import type {
  TendonActuator,
  TendonOptions,
  TendonProfile,
  TendonViaRef,
  TendonWrapRef,
} from '../mates/tendon';
import type { AssemblyState } from './assemblyState';

function bad(name: string, code: string, detail: string, hint: string): KernelError {
  return invalidArgsError({
    api: `tendon('${name}', opts)`,
    gotText: `assembly.tendon.${code}: ${detail}`,
    requires: hint,
    hintSlug: `invalid-args.assembly.tendon-${code}`,
    example: "arm.tendon('line', { from: 'a.eye', via: ['b.pulley'], to: 'c.eye', actuator: { kind: 'force', maxForceN: 40 } })",
  });
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
  const act = opts.actuator;
  if (act === undefined) return undefined;
  if (act.kind !== 'force' || typeof act.maxForceN !== 'number' || !Number.isFinite(act.maxForceN) || act.maxForceN <= 0) {
    throw bad(name, 'invalid-actuator', `actuator must be { kind: 'force', maxForceN: <positive finite N> }; got ${JSON.stringify(act)}.`,
      `pass actuator: { kind: 'force', maxForceN: 40 }.`);
  }
  return { kind: 'force', maxForceN: act.maxForceN };
}

export function normalizeTendonProfile(name: string, opts: TendonOptions): TendonProfile | undefined {
  const p = opts.profile;
  if (p === undefined) return undefined;
  const pos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (p.kind === 'round' && pos(p.diameterMm)) return { kind: 'round', diameterMm: p.diameterMm };
  if (p.kind === 'flat' && pos(p.widthMm) && pos(p.thicknessMm)) {
    const a = p.widthAxis;
    if (a !== undefined && (a.length !== 3 || a.some((x) => !Number.isFinite(x)) || Math.hypot(a[0], a[1], a[2]) === 0)) {
      throw bad(name, 'invalid-profile', `profile.widthAxis must be a finite non-zero [x, y, z].`,
        `pass widthAxis in the owning part's frame, or omit it for [0, 1, 0].`);
    }
    return { kind: 'flat', widthMm: p.widthMm, thicknessMm: p.thicknessMm, ...(a !== undefined ? { widthAxis: [a[0], a[1], a[2]] as Vec3 } : {}) };
  }
  throw bad(name, 'invalid-profile', `profile must be { kind: 'round', diameterMm } or { kind: 'flat', widthMm, thicknessMm, widthAxis? } with positive sizes.`,
    `pass profile: { kind: 'flat', widthMm: 5, thicknessMm: 1.2 }.`);
}
