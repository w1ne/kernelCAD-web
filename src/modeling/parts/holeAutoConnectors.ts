// src/modeling/parts/holeAutoConnectors.ts
//
// Bracket-side auto-connector rule: any hole feature emits a `bolt-holes-N`
// connector at the hole's bottom face + through-axis. Deterministically
// numbered (by hole (u, v) tie-break) so that the same model script always
// emits the same connector names across re-runs.

import { formatTopoRef } from '../../kernel/naming';

export interface HoleCenter {
  /** Face-local U coordinate, mm. */
  u: number;
  /** Face-local V coordinate, mm. */
  v: number;
  /** Through-axis vector (typically -Z in face-local frame). */
  axis: [number, number, number];
  /** Hole depth, mm — used to place bottom-face origin. */
  depthMm: number;
}

export interface AutoConnector {
  name: string;
  ref: string;
  origin: [number, number, number];
  axis: [number, number, number];
  type: 'frame';
}

export interface AutoConnectorOpts {
  partName: string;
}

export function generateBoltHoleConnectors(
  holes: ReadonlyArray<HoleCenter>,
  opts: AutoConnectorOpts,
): AutoConnector[] {
  const sorted = [...holes].sort((a, b) => a.u - b.u || a.v - b.v);
  return sorted.map((h, idx) => {
    const n = idx + 1;
    const name = `bolt-holes-${n}`;
    // Bottom face of the hole: depth along the through-axis from the face plane.
    const origin: [number, number, number] = [h.u, h.v, -h.depthMm];
    return {
      name,
      ref: formatTopoRef({
        owner: opts.partName,
        kind: 'connector',
        segments: [name],
      }),
      origin,
      axis: h.axis,
      type: 'frame',
    };
  });
}
