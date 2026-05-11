// src/lib/mates/mate.ts
//
// Mate record + capture-time connector-ref parser. A mate connects two named
// connectors with one of the 7 mate types from `mateTypes.ts`. Type-pair
// compatibility is checked at capture time (build123d-style early error), not
// at solve time — see `isCompatiblePair` in `mateTypes.ts`. The Assembly
// builder surfaces these records on `scene.mates` returned by
// `Assembly.model()` / `Assembly.solvedModel()`.

import type { MateType } from './mateTypes';

export interface MateRecord {
  readonly name: string;
  /** "<partName>.<connectorName>" */
  readonly a: string;
  /** "<partName>.<connectorName>" */
  readonly b: string;
  readonly type: MateType;
}

export function parseConnectorRef(ref: string): { partName: string; connectorName: string } {
  const dot = ref.indexOf('.');
  if (dot < 1 || dot === ref.length - 1) {
    throw new Error(
      `assembly.mate.connector-not-found: '${ref}' is not a 'partName.connectorName' reference.`,
    );
  }
  return { partName: ref.slice(0, dot), connectorName: ref.slice(dot + 1) };
}
