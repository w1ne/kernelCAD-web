// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Option validation for `normaliseAutoAnnotate` in `drawingAuto.ts`. Code
// moved here unchanged; each validation error keeps its exact message.
import { KernelError } from '../../../shared/intent/kernelError';
import { DATUM_LABEL_RE, type DrawingDatumDecl } from '../../../shared/intent/drawingGdtRecord';

export type Iso2768Class = 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c';

export const AUTO_ANNOTATE_KINDS = [
  'datums',
  'flatness',
  'holes',
  'hole-positions',
  'overall',
  'fillets',
  'chamfers',
  'general-tolerance',
] as const;

export type AutoAnnotateKind = (typeof AUTO_ANNOTATE_KINDS)[number];

const CLASSES: readonly Iso2768Class[] = ['ISO2768-f', 'ISO2768-m', 'ISO2768-c'];

export function invalid(field: string, why: string): never {
  throw new KernelError(
    'feature.invalid-args',
    `svg-drawing: options.autoAnnotate${field} ${why}.`,
    undefined,
    "Pass autoAnnotate: true, or { tolerance?: 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c', datums?: 'auto' | [{ label, face }], include?: [...] }.",
  );
}

export function normaliseAutoAnnotateTolerance(raw: Iso2768Class | undefined): Iso2768Class {
  const tolerance = raw ?? 'ISO2768-m';
  if (!CLASSES.includes(tolerance)) {
    invalid('.tolerance', `must be one of ${CLASSES.join(' | ')}; got ${JSON.stringify(raw)}`);
  }
  return tolerance;
}

export function normaliseAutoAnnotateInclude(raw: readonly AutoAnnotateKind[] | undefined): Set<AutoAnnotateKind> {
  if (raw === undefined) {
    return new Set(AUTO_ANNOTATE_KINDS);
  }
  if (!Array.isArray(raw)) invalid('.include', `must be an array; got ${JSON.stringify(raw)}`);
  for (const k of raw) {
    if (!(AUTO_ANNOTATE_KINDS as readonly string[]).includes(k)) {
      invalid('.include', `entries must be one of ${AUTO_ANNOTATE_KINDS.join(' | ')}; got ${JSON.stringify(k)}`);
    }
  }
  return new Set(raw);
}

export function normaliseAutoAnnotateDatums(raw: 'auto' | readonly DrawingDatumDecl[] | undefined): DrawingDatumDecl[] {
  const datums: DrawingDatumDecl[] = [];
  if (raw !== undefined && raw !== 'auto') {
    if (!Array.isArray(raw)) {
      invalid('.datums', `must be 'auto' or an array of { label, face }; got ${JSON.stringify(raw)}`);
    }
    for (const [i, d] of raw.entries()) {
      if (typeof d !== 'object' || d === null || typeof d.label !== 'string' || !DATUM_LABEL_RE.test(d.label)) {
        invalid(`.datums[${i}].label`, `must be one or two capital letters other than I, O and Q; got ${JSON.stringify(d?.label)}`);
      }
      if (typeof d.face !== 'object' || d.face === null || Array.isArray(d.face)) {
        invalid(`.datums[${i}].face`, `must be a FaceQuery object; got ${JSON.stringify(d.face)}`);
      }
      datums.push({ label: d.label, face: d.face });
    }
  }
  return datums;
}
