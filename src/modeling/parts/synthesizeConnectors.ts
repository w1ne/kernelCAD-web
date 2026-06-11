// src/modeling/parts/synthesizeConnectors.ts
//
// Fetch-time connector synthesis for parts pulled from a remote catalog
// (step.parts and any future source). Catalog STEP files arrive as dead solids
// with no connector frames, so a *found* part could not mate without the user
// hand-authoring `partRef.connector(...)`. This recovers the same auto-connector
// convention bundled parts ship with, from the geometry alone:
//
//   mating-face  ← bbox min-Z face (normal -Z)
//   top-face     ← bbox max-Z face (normal +Z)
//   bore         ← largest-diameter detected hole's axis (mount-on-shaft)
//   bolt-holes-N ← every detected hole, mouth origin + through-axis,
//                  deterministically numbered (matches the bundled rule)
//
// Input is a StepInspectReport (from inspectStepFile) — bbox + cylindrical holes
// already measured. This is a pure function: no I/O, fully unit-testable.

import { formatTopoRef } from '../../kernel/naming';
import type { AutoConnector } from './holeAutoConnectors';
import type { StepInspectReport } from '../../agent/inspect/inspectStep';

function conn(
  name: string,
  origin: [number, number, number],
  axis: [number, number, number],
  partName: string,
): AutoConnector {
  return {
    name,
    ref: formatTopoRef({ owner: partName, kind: 'connector', segments: [name] }),
    origin,
    axis,
    // Stored as 'frame' with an axis/normal vector — the same shape the bundled
    // sidecar loader uses for both frame and axis connectors downstream.
    type: 'frame',
  };
}

/**
 * Synthesize auto-connectors for an imported catalog STEP from its inspection
 * report. Uses the report's largest solid (by volume) as the body. Returns an
 * empty list if the report has no solids.
 */
export function synthesizeConnectorsFromReport(
  report: StepInspectReport,
  partName: string,
): AutoConnector[] {
  if (report.solids.length === 0) return [];
  // Dominant body = largest solid by volume; vendor STEP often bundles tiny
  // helper solids (washmagnets, label plates) we don't want driving the frame.
  const solid = [...report.solids].sort((a, b) => b.volumeMm3 - a.volumeMm3)[0];
  const { min, max } = solid.bboxExact;
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;

  const out: AutoConnector[] = [
    conn('mating-face', [cx, cy, min[2]], [0, 0, -1], partName),
    conn('top-face', [cx, cy, max[2]], [0, 0, 1], partName),
  ];

  // Collapse coaxial holes. Hole detection splits one physical bore into several
  // cylindrical segments (counterbores, seam splits, blind+through halves); each
  // would otherwise become its own bolt-holes-N. Group by axis line (rounded
  // x, y to 0.1 mm) and keep the largest-diameter member as the representative.
  const groups = new Map<string, (typeof solid.holes)[number]>();
  for (const h of solid.holes) {
    const key = `${Math.round(h.axisOrigin[0] * 10) / 10},${Math.round(h.axisOrigin[1] * 10) / 10}`;
    const prev = groups.get(key);
    if (!prev || h.diameterMm > prev.diameterMm) groups.set(key, h);
  }
  const reps = [...groups.values()];

  // bore — the single largest-diameter axis (the mount-on-shaft hole). Only
  // treat it as a non-fastener bore (and drop it from bolt-holes) when it is
  // DISTINCTLY larger than the rest; on a uniform N-hole bracket every hole is
  // a fastener and there is no separate bore.
  const byDia = [...reps].sort((a, b) => b.diameterMm - a.diameterMm);
  const bore = byDia[0];
  const boreIsDistinct =
    byDia.length >= 2 && bore.diameterMm >= 1.4 * byDia[1].diameterMm;

  const boltSource = boreIsDistinct ? reps.filter((h) => h !== bore) : reps;
  const boltHoles = [...boltSource].sort(
    (a, b) => a.axisOrigin[0] - b.axisOrigin[0] || a.axisOrigin[1] - b.axisOrigin[1],
  );
  boltHoles.forEach((h, idx) => {
    out.push(conn(`bolt-holes-${idx + 1}`, h.axisOrigin, h.axisDirection, partName));
  });

  if (bore) {
    out.push(conn('bore', bore.axisOrigin, bore.axisDirection, partName));
  }

  return out;
}
