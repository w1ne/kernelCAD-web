// SPDX-License-Identifier: CC0-1.0
// Fiber drop terminal: a pole-mounted multiport service terminal. What makes it one is a moulded
// polymer housing (no painted steel case) with a lid seam and stainless lid screws, six hardened
// drop ports on the front, each a housing boss closed by a black dust cap, a black tether stub
// cable that leaves through a gland under the housing, and a stainless bracket held to the pole by
// two band straps.

meta({
  name: "fiber-drop-terminal",
  license: 'CC0-1.0',
  title: "Fiber drop terminal",
  description: "Pole-mounted fiber drop terminal (multiport service terminal): a moulded polymer housing with a lid seam and stainless lid screws, six hardened drop ports with black dust caps on the front, a black tether stub cable from a gland under the housing, and a stainless mounting bracket with two band straps round a wood pole section. Knobs: overall scale; polymer housing, black polymer caps and cable, stainless steel, pole wood.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1100,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const housing = param('housing', '#3d4347', { label: 'Housing and port bosses (moulded polymer)' });
const polymer = param('polymer', '#15191c', { label: 'Dust caps, lid seam, gland and tether cable (black polymer)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Bracket, band straps and lid screws (stainless steel)' });
const poleWood = param('poleWood', '#7a5b3e', { label: 'Pole section (treated wood)' });
presets({
  fieldSite: {
    housing: '#5d6660',
    polymer: '#1f2421',
    stainlessSteel: '#c8d0cf',
    poleWood: '#5f4a36',
  },
  highVisibility: {
    housing: '#e0aa18',
    polymer: '#1b1f22',
    stainlessSteel: '#e4e9e6',
    poleWood: '#8a6a4a',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).translate(x, y, z).scale(scale);
// Cylinder with its axis along Y, from y0 toward the viewer (-Y) over h.
const cY = (x: number, y0: number, z: number, h: number, r: number, n = 12) => cylinder(h, r, n).rotateX(90).translate(x, y0, z).scale(scale);
const profile = (pts: Array<[number, number]>) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [u, v] of pts.slice(1)) pb = pb.lineTo(u, v);
  return pb.close();
};

const POLE_R = 110;
const POLE_Y = 190;           // pole axis behind the terminal
const POLE_H = 1100;
const BRACKET_Y = POLE_Y - POLE_R; // bracket back face touches the pole front
const BRACKET_T = 6;
const L = 400;                // housing length (x)
const BACK = BRACKET_Y - BRACKET_T; // housing back face on the bracket
const D = 150;                // housing depth (y)
const FRONT = BACK - D;       // housing front face
const Z0 = 480;               // housing underside
const H = 190;                // housing height
const CH = 22;                // moulded chamfer on the housing edges
const SEAM = Z0 + 130;        // lid parting line

// Housing cross-section as (-z, y) points, extruded along x: chamfered front and back edges.
const housingBody = profile([
  [-Z0, FRONT + CH], [-Z0, BACK - CH], [-(Z0 + CH), BACK], [-(Z0 + H - CH), BACK],
  [-(Z0 + H), BACK - CH], [-(Z0 + H), FRONT + CH], [-(Z0 + H - CH), FRONT], [-(Z0 + CH), FRONT],
]).extrude(L).rotateY(90).translate(-L / 2, 0, 0).scale(scale);

const p = assembly("fiber-drop-terminal");
p.part("pole", c(0, POLE_Y, 0, POLE_H, POLE_R, 20).color(poleWood));
for (const [i, z] of [Z0 + 20, Z0 + H - 45].entries()) {
  p.part(`band-strap-${i}`, c(0, POLE_Y, z, 25, POLE_R + 2, 20).color(stainlessSteel));
}
p.part("bracket", b(0, BRACKET_Y - BRACKET_T / 2, Z0 - 10, 180, BRACKET_T, H + 20).color(stainlessSteel));
p.part("housing", housingBody.color(housing));
// The lid seam is a thin black gasket line round the front and both ends.
p.part("lid-seam", b(0, FRONT + D / 2 - 1, SEAM, L + 2, D - 2, 4).color(polymer));
for (const [i, x] of [-L / 2 + 30, -L / 6, L / 6, L / 2 - 30].entries()) {
  p.part(`lid-screw-${i}`, cY(x, FRONT, SEAM + 30, 4, 6, 8).color(stainlessSteel));
}
// Six hardened drop ports in one row below the seam: housing boss, black dust cap.
for (let i = 0; i < 6; i++) {
  const x = -150 + i * 60;
  p.part(`port-boss-${i}`, cY(x, FRONT, Z0 + 65, 14, 21).color(housing));
  p.part(`port-cap-${i}`, cY(x, FRONT - 14, Z0 + 65, 26, 17).color(polymer));
}
// The tether stub cable leaves through a gland under the housing and drops to the ground beside the pole.
p.part("tether-gland", c(L / 2 - 50, FRONT + D / 2, Z0 - 30, 30, 18).color(polymer));
p.part("tether-cable", c(L / 2 - 50, FRONT + D / 2, 0, Z0 - 30, 9, 10).color(polymer));

return p.model();
