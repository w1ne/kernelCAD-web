// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pathfinder hobby rocket: 42 mm body, tangent-ogive nose, three trapezoidal
// fins, 24 mm F-class motor, 450 mm parachute at apogee + 1 s. The flight
// study takes mass and CG from these parts, the Barrowman CP from the nose
// and fin geometry, and gates evaluate on a 1-caliber static margin.
// `run_flight` returns apogee, speeds, descent rate and a time series.
//
// The thrust table is a generic F-class profile, not a certified curve.

const R = 21;          // body radius, mm
const tubeLen = 400;   // body tube length, mm
const noseLen = 130;   // nose length tip to shoulder, mm

const arm = assembly('pathfinder');

// Body tube along +Z, tail at z = 0.
const tube = cylinder(tubeLen, R).subtract(cylinder(tubeLen, R - 0.7));

// Tangent ogive nose with a 30 mm shoulder inside the tube.
const rho = (R * R + noseLen * noseLen) / (2 * R);
let nose = path().moveTo(0, tubeLen + noseLen);
for (let i = 1; i <= 24; i++) {
  const x = (noseLen * i) / 24; // distance aft of the tip
  const r = Math.sqrt(rho * rho - (noseLen - x) * (noseLen - x)) + R - rho;
  nose = nose.lineTo(Math.min(R, r), tubeLen + noseLen - x);
}
const noseCone = nose
  .lineTo(R - 1.1, tubeLen)
  .lineTo(R - 1.1, tubeLen - 30)
  .lineTo(0, tubeLen - 30)
  .close()
  .revolve();

// Three fins: root 80 mm at the tube surface, tip 40 mm, span 45 mm, 40 mm sweep.
const fin = path()
  .moveTo(R, 0)
  .lineTo(R, 80)
  .lineTo(R + 45, 40)
  .lineTo(R + 45, 0)
  .close()
  .extrude(3)
  .rotate([1, 0, 0], 90)
  .translate(0, 1.5, 0);
// A thin fin-can sleeve over the tube joins the three fins into one part.
const sleeve = cylinder(80, R + 0.8).subtract(cylinder(80, R));
const fins = sleeve.union(fin).union(fin.rotate([0, 0, 1], 120)).union(fin.rotate([0, 0, 1], 240));

const motor = cylinder(70, 12).translate(0, 0, 2);
const chute = cylinder(60, 17).translate(0, 0, 250);
const avionics = box(30, 30, 60, true).translate(0, 0, 180);

arm.part('body-tube', tube, { material: 'pla' });
arm.part('ogive-nose-cone', noseCone, { material: 'pla' });
arm.part('fins', fins, { material: 'pla' });
arm.part('motor', motor, { massKg: 0.062 });
arm.part('parachute-450mm', chute, { massKg: 0.03 });
arm.part('avionics', avionics, { massKg: 0.06 });

arm.flightStudy({
  motor: {
    thrustCurve: [[0, 0], [0.05, 18], [0.15, 30], [0.25, 31], [0.4, 24], [0.6, 20], [1.0, 18.5],
      [1.4, 18], [1.7, 17], [1.9, 12], [2.05, 4], [2.12, 0]],
    totalMassKg: 0.062,
    propellantKg: 0.030,
    part: 'motor',
  },
  aero: { cd: 0.55, nose: { shape: 'ogive', part: 'ogive-nose-cone' }, fins: { count: 3, part: 'fins' } },
  launch: { railM: 1.5, angleDeg: 0, siteAltitudeM: 120, windMs: 0 },
  recovery: [{ part: 'parachute-450mm', cd: 1.5, diameterMm: 450, deploy: 'apogee+1', separates: ['ogive-nose-cone'] }],
  minStabilityCal: 1.0,
});

return arm.model();
