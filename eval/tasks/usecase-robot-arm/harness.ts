// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-robot-arm/harness.ts
//
// U7 3-axis robot arm: links, rest-pose collisions, servo pocket, the
// mechanism verdict, and the URDF joints and limits. See
// eval/tasks/USECASES.md.
import { strFromU8 } from 'fflate';
import type { HarnessResult } from '../../types';
import {
  buildUsecase, bbox, emptyIn, evaluateScriptVerdict, exportAs, near, part, standardExports, standardGates,
} from '../../usecaseChecks';

const PARTS = ['base', 'base-yaw-servo', 'rotor', 'shoulder-servo', 'upper-arm', 'elbow-servo', 'forearm'];
const JOINTS: Record<string, [number, number]> = { 'base-yaw': [-90, 90], shoulder: [-10, 20], elbow: [-100, 10] };

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const b = await buildUsecase(scriptPath);
  const gates = standardGates(b, PARTS);
  if (!gates['evaluates clean'] || !gates[`parts: ${PARTS.join(', ')}`]) return { gates, scored: {} };
  const upper = bbox(part(b, 'upper-arm'));
  const fore = bbox(part(b, 'forearm'));

  let overlap = 0;
  for (let i = 0; i < b.parts.length; i++) {
    for (let j = i + 1; j < b.parts.length; j++) overlap += b.parts[i].shape.intersectionVolume(b.parts[j].shape);
  }

  const urdf = await exportAs(b, 'urdf');
  const xml = urdf.ok ? strFromU8(urdf.bytes) : '';
  const links = [...xml.matchAll(/<link\s+name="([^"]+)"/g)].map((m) => m[1]);
  const deg = (rad: string) => (Number(rad) * 180) / Math.PI;
  const revolute = new Map<string, [number, number]>();
  for (const m of xml.matchAll(/<joint\s+name="([^"]+)"\s+type="revolute">([\s\S]*?)<\/joint>/g)) {
    const lim = /<limit[^>]*lower="([^"]+)"[^>]*upper="([^"]+)"/.exec(m[2]);
    if (lim) revolute.set(m[1], [deg(lim[1]), deg(lim[2])]);
  }

  return {
    gates,
    scored: {
      'base on z = 0': near(bbox(part(b, 'base')).min[2], 0),
      'upper arm 120 long': near(upper.min[0], 0) && near(upper.max[0], 120),
      'forearm 100 long': near(fore.min[0], 120) && near(fore.max[0], 220),
      'no parts overlap in the rest pose': overlap < 1e-6,
      'SG90 pocket 24 x 13 x 9 in the base': emptyIn(part(b, 'base'), [-33.95, -6.45, 7.05], [-10.05, 6.45, 15.95]),
      'mechanism real (evaluate_script, mechanism gate on)': await evaluateScriptVerdict(scriptPath),
      'URDF has seven links': PARTS.every((p) => links.includes(p)) && links.length === PARTS.length,
      'URDF revolute joints with limits': revolute.size === 3 && Object.entries(JOINTS).every(([name, [lo, hi]]) => {
        const got = revolute.get(name);
        return got !== undefined && Math.abs(got[0] - lo) < 0.01 && Math.abs(got[1] - hi) < 0.01;
      }),
      ...(await standardExports(b, { solids: 7 })),
    },
  };
}
