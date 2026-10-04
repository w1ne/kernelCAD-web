// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-spur-gear-pair/solution-expert.kcad.ts
//
// Typical use case U6: spur gear pair, module 1, 20 and 40 teeth, 20° pressure
// angle, 8 mm face width, 5 mm bores with a key flat, meshing at a 30 mm
// centre distance.
//
// Each gear is ONE closed involute profile (root, flank, tip, flank, root, ...)
// extruded once: no per-tooth booleans, so the gear builds in well under a
// second and meshes to a watertight STL.

const moduleMm = 1;
const z1 = 20;
const z2 = 40;
const pressureDeg = 20;
const faceWidth = 8;
const boreDia = 5;
const flatDepth = 0.5; // key flat: 0.5 mm off the bore wall
// Angular backlash per flank (rad at the pitch circle) so the teeth never touch.
const backlash = 0.02;
const samplesPerFlank = 8;

const centreDistance = (moduleMm * (z1 + z2)) / 2; // 30 mm

const inv = (t: number) => t - Math.atan(t);

/** Closed involute gear outline, tooth 0 centred on +X. */
function gearProfile(teeth: number) {
  const phi = (pressureDeg * Math.PI) / 180;
  const pitchR = (teeth * moduleMm) / 2;
  const baseR = pitchR * Math.cos(phi);
  const tipR = pitchR + moduleMm;
  const rootR = pitchR - 1.25 * moduleMm;
  const tPitch = Math.tan(Math.acos(baseR / pitchR));
  const tTip = Math.sqrt((tipR / baseR) ** 2 - 1);
  const tStart = rootR > baseR ? Math.sqrt((rootR / baseR) ** 2 - 1) : 0;
  // Half the tooth angle at the pitch circle, less backlash.
  const halfPitch = Math.PI / (2 * teeth) - backlash / pitchR;
  // Polar half-angle of the flank at involute parameter t.
  const flank = (t: number) => halfPitch + inv(tPitch) - inv(t);

  const pts: [number, number][] = [];
  const polar = (r: number, a: number) => pts.push([r * Math.cos(a), r * Math.sin(a)]);
  for (let k = 0; k < teeth; k++) {
    const c = (2 * Math.PI * k) / teeth;
    // Leading flank, root to tip.
    if (rootR < baseR) polar(rootR, c - flank(0));
    for (let s = 0; s <= samplesPerFlank; s++) {
      const t = tStart + ((tTip - tStart) * s) / samplesPerFlank;
      polar(baseR * Math.sqrt(1 + t * t), c - flank(t));
    }
    // Trailing flank, tip to root.
    for (let s = samplesPerFlank; s >= 0; s--) {
      const t = tStart + ((tTip - tStart) * s) / samplesPerFlank;
      polar(baseR * Math.sqrt(1 + t * t), c + flank(t));
    }
    if (rootR < baseR) polar(rootR, c + flank(0));
  }
  let p = path().moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p = p.lineTo(pts[i][0], pts[i][1]);
  return p.close();
}

/** Gear turned by `phaseDeg`, with a D-flat keyed bore (flat on +X). */
function gear(teeth: number, phaseDeg = 0) {
  const r = boreDia / 2;
  const x = r - flatDepth; // the flat
  const y = Math.sqrt(r * r - x * x);
  const bore = path().moveTo(x, -y).lineTo(x, y).threePointsArc(x, -y, -r, 0).close();
  return gearProfile(teeth).extrude(faceWidth).rotateZ(phaseDeg).subtract(bore.extrude(faceWidth + 2).translate(0, 0, -1));
}

const pinion = gear(z1);
// Turn the wheel half a tooth so a gap faces the pinion tooth on +X.
const wheel = gear(z2, 180 / z2).translate(centreDistance, 0, 0);

const pair = assembly('spur-gear-pair');
pair.part('pinion', pinion, { material: 'nylon' });
pair.part('gear', wheel, { material: 'nylon' });
return pair.model();
