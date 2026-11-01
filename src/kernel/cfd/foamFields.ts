// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/foamFields.ts
//
// Initial / boundary-condition field files (0/U, 0/p and, for k-omega SST,
// 0/k, 0/omega, 0/nut). One boundary entry per patch, chosen by the patch's
// role, so the BCs follow the face names the study declared.

import type { FoamCaseSpec, FoamPatch, Vec3 } from './types';

type Header = (cls: string, object: string, location?: string) => string;

const n = (v: number): string => (v === 0 ? '0' : String(Number(v.toPrecision(9))));
const vec = (v: Vec3): string => `(${v.map(n).join(' ')})`;

function allPatches(spec: FoamCaseSpec): FoamPatch[] {
  const seen = new Map<string, FoamPatch>();
  for (const p of [...spec.blockPatches, ...spec.stlPatches]) if (!seen.has(p.name)) seen.set(p.name, p);
  return [...seen.values()];
}

function uInlet(spec: FoamCaseSpec): string {
  const i = spec.inlet;
  if (i.kind === 'normalSpeed') return `type surfaceNormalFixedValue; refValue uniform ${n(-i.speed)}; value uniform (0 0 0);`;
  if (i.kind === 'flowRate') {
    return `type flowRateInletVelocity; volumetricFlowRate constant ${n(i.m3s)}; extrapolateProfile no; value uniform (0 0 0);`;
  }
  return `type fixedValue; value uniform ${vec(i.U)};`;
}

function uBc(spec: FoamCaseSpec, p: FoamPatch): string {
  switch (p.role) {
    case 'inlet': return uInlet(spec);
    case 'outlet': return 'type inletOutlet; inletValue uniform (0 0 0); value uniform (0 0 0);';
    case 'wall': return 'type noSlip;';
    case 'slip': return 'type slip;';
    case 'background': return 'type zeroGradient;';
  }
}

function pBc(spec: FoamCaseSpec, p: FoamPatch): string {
  switch (p.role) {
    case 'outlet': return `type fixedValue; value uniform ${n(spec.outletKinematicP)};`;
    case 'slip': return 'type slip;';
    default: return 'type zeroGradient;';
  }
}

function turbBc(field: 'k' | 'omega' | 'nut', value: number, p: FoamPatch): string {
  if (p.role === 'slip') return 'type slip;';
  if (p.role === 'wall') {
    if (field === 'k') return `type kqRWallFunction; value uniform ${n(value)};`;
    if (field === 'omega') return `type omegaWallFunction; value uniform ${n(value)};`;
    return 'type nutkWallFunction; value uniform 0;';
  }
  if (field === 'nut') return 'type calculated; value uniform 0;';
  if (p.role === 'inlet') return `type fixedValue; value uniform ${n(value)};`;
  if (p.role === 'outlet') return `type inletOutlet; inletValue uniform ${n(value)}; value uniform ${n(value)};`;
  return 'type zeroGradient;';
}

function field(
  header: Header,
  cls: 'volScalarField' | 'volVectorField',
  name: string,
  dims: string,
  internal: string,
  bc: (p: FoamPatch) => string,
  patches: FoamPatch[],
): string {
  return header(cls, name, '0') + [
    `dimensions      ${dims};`,
    `internalField   uniform ${internal};`,
    'boundaryField',
    '{',
    ...patches.map(p => `    ${p.name} { ${bc(p)} }`),
    '}',
    '',
  ].join('\n');
}

export function writeFieldFiles(spec: FoamCaseSpec, header: Header): Record<string, string> {
  const patches = allPatches(spec);
  const U0: Vec3 = spec.inlet.kind === 'freestream' ? spec.inlet.U : [0, 0, 0];
  const out: Record<string, string> = {
    '0/U': field(header, 'volVectorField', 'U', '[0 1 -1 0 0 0 0]', vec(U0), p => uBc(spec, p), patches),
    '0/p': field(header, 'volScalarField', 'p', '[0 2 -2 0 0 0 0]', n(spec.outletKinematicP), p => pBc(spec, p), patches),
  };
  if (spec.turbulence === 'kOmegaSST') {
    const { k, omega } = spec.turbulenceInlet;
    out['0/k'] = field(header, 'volScalarField', 'k', '[0 2 -2 0 0 0 0]', n(k), p => turbBc('k', k, p), patches);
    out['0/omega'] = field(header, 'volScalarField', 'omega', '[0 0 -1 0 0 0 0]', n(omega), p => turbBc('omega', omega, p), patches);
    out['0/nut'] = field(header, 'volScalarField', 'nut', '[0 2 -1 0 0 0 0]', '0', p => turbBc('nut', 0, p), patches);
  }
  return out;
}
