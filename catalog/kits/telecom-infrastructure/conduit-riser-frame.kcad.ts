// SPDX-License-Identifier: CC0-1.0
// Conduit riser frame: a galvanized strut-channel frame on a wall (two vertical rails anchored to the
// wall, two horizontal strut bridges bolted across them) that holds three rigid conduits with
// stainless strut pipe clamps. The open C-channel profiles, the clamps round each conduit and the
// polymer bushings with cables at the conduit tops make it read as a riser, not a ladder of bars.

meta({
  name: "conduit-riser-frame",
  license: 'CC0-1.0',
  title: "Conduit riser frame",
  description: "Galvanized strut-channel riser frame: two wall rails on anchor bolts and two strut bridges that hold three rigid galvanized conduits with stainless strut pipe clamps, and polymer end bushings with cables at the conduit tops. Knobs: overall scale; galvanized steel, stainless steel, polymer bushings and cable jacket.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Strut frame and conduits (galvanized steel)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Pipe clamps and bolts (stainless steel)' });
const polymer = param('polymer', '#22292d', { label: 'End bushings and cable jacket (polymer)' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    stainlessSteel: '#d0d9d6',
    polymer: '#263a37',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    stainlessSteel: '#e4e9e6',
    polymer: '#e0aa18',
  },
});

const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);
// Hex nut or bolt head with its axis along Y, from y0 toward the wall (+Y) over h.
const hexY = (x: number, y0: number, z: number, h: number, r: number) => cylinder(h, r, 6).rotateX(90).translate(x, y0 + h, z).scale(scale);

const W = 41;        // strut channel width and depth (41 x 41 mm)
const T = 3;         // strut wall thickness
const LIP = 10;      // in-turned lip of the open face
const H = 1300;      // rail and conduit height
const RAIL_X = 330;  // rail centre lines
const BRIDGE_L = 740;
const R = 40;        // conduit radius (80 mm OD)
const CY = -2 * W - R; // conduit axis: the conduit bears on the bridge open face (y = -2W)
const CONDUIT_X = [-210, 0, 210];
const BRIDGES: Array<[string, number]> = [['bottom', 250], ['top', 1140]];
const CLAMP_H = 30;
const EAR = 20;

// Strut C-profile: a across the width (centred), d from the back web (0) to the open face (-W).
const STRUT: Array<[number, number]> = [
  [-W / 2, 0], [W / 2, 0], [W / 2, -W], [W / 2 - LIP, -W], [W / 2 - LIP, -W + T], [W / 2 - T, -W + T],
  [W / 2 - T, -T], [-W / 2 + T, -T], [-W / 2 + T, -W + T], [-W / 2 + LIP, -W + T], [-W / 2 + LIP, -W], [-W / 2, -W],
];
const profile = (pts: Array<[number, number]>) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [u, v] of pts.slice(1)) pb = pb.lineTo(u, v);
  return pb.close();
};
// Vertical rail on the wall face (y = 0), open face toward -Y, extruded up Z.
const rail = (x: number) => profile(STRUT.map(([a, d]) => [x + a, d])).extrude(H).scale(scale);
// Horizontal bridge across the rail fronts (y = -W), open face toward -Y, run along X.
// Points (-z, y) extruded along Z, then rotateY(90) maps them to (x = run, y, z).
const bridge = (zc: number) =>
  profile(STRUT.map(([a, d]) => [-(zc + a), -W + d])).extrude(BRIDGE_L).rotateY(90).translate(-BRIDGE_L / 2, 0, 0).scale(scale);
// Strut pipe clamp seen from above: a strap round the front of the conduit, ears flat on the bridge face.
const clamp = (cx: number, zc: number) => {
  const N = 6;
  const ri = R, ro = R + T, face = -2 * W;
  let pb = path().moveTo(cx + ro + EAR, face).lineTo(cx + ro + EAR, face - T).lineTo(cx + ro, face - T).lineTo(cx + ro, CY);
  for (let i = 1; i <= N; i++) {
    const a = -(Math.PI * i) / N;
    pb = pb.lineTo(cx + ro * Math.cos(a), CY + ro * Math.sin(a));
  }
  pb = pb.lineTo(cx - ro, face - T).lineTo(cx - ro - EAR, face - T).lineTo(cx - ro - EAR, face).lineTo(cx - ri, face).lineTo(cx - ri, CY);
  for (let i = N - 1; i >= 0; i--) {
    const a = -(Math.PI * i) / N;
    pb = pb.lineTo(cx + ri * Math.cos(a), CY + ri * Math.sin(a));
  }
  return pb.lineTo(cx + ri, face).close().extrude(CLAMP_H).translate(0, 0, zc - CLAMP_H / 2).scale(scale);
};

const p = assembly("conduit-riser-frame");
for (const [id, x] of [['left', -RAIL_X], ['right', RAIL_X]] as Array<[string, number]>) {
  p.part(`rail-${id}`, rail(x).color(galvanizedSteel));
  for (const [n, z] of [100, 700, 1200].entries()) p.part(`anchor-bolt-${id}-${n}`, hexY(x, -T - 10, z, 10, 9).color(stainlessSteel));
}
for (const [id, zc] of BRIDGES) {
  p.part(`bridge-${id}`, bridge(zc).color(galvanizedSteel));
  for (const [n, x] of [-RAIL_X, RAIL_X].entries()) p.part(`frame-bolt-${id}-${n}`, hexY(x, -W - T - 8, zc, 8, 9).color(stainlessSteel));
  for (const [i, cx] of CONDUIT_X.entries()) {
    p.part(`clamp-${id}-${i}`, clamp(cx, zc).color(stainlessSteel));
    for (const [n, dx] of [-(R + T + EAR / 2), R + T + EAR / 2].entries()) {
      p.part(`clamp-bolt-${id}-${i}-${n}`, hexY(cx + dx, -2 * W - T - 7, zc, 7, 7).color(stainlessSteel));
    }
  }
}
for (const [i, cx] of CONDUIT_X.entries()) {
  p.part(`conduit-${i}`, c(cx, CY, 0, H, R, 16).color(galvanizedSteel));
  p.part(`bushing-${i}`, c(cx, CY, H, 18, R + 4, 16).color(polymer));
  p.part(`cable-${i}`, c(cx + 8, CY - 6, H + 18, 110, 16, 10).color(polymer));
}

return p.model();
