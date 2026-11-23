// SPDX-License-Identifier: CC0-1.0
// Remote power shelf: a 19-inch, 3U DC power shelf for a telecom rack. One painted steel chassis
// carries an L-shaped rack ear on each side, fixed to the rack rails with stainless screws. The front
// holds a controller and four hot-swap rectifier modules with aluminium faces, vent slots and pull
// handles. The rack ears, the module row and the 3U height make it read as rack power, not a crate.

meta({
  name: "remote-power-shelf",
  license: 'CC0-1.0',
  title: "Remote power shelf",
  description: "19-inch 3U rack DC power shelf: one powder-coated steel chassis with L-shaped rack ears and stainless rack screws, a controller with display and ports, four hot-swap rectifier modules with aluminium faces, vent slots and polymer pull handles, and a rear terminal cover. Knobs: overall scale; powder-coated steel, aluminium, stainless steel, polymer.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 1000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#353c41', { label: 'Chassis and rack ears (powder-coated steel)' });
const aluminium = param('aluminium', '#b4bcbf', { label: 'Module faces (aluminium)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Rack screws (stainless steel)' });
const polymer = param('polymer', '#1c2124', { label: 'Handles, vents, display and terminal cover (polymer)' });
presets({
  fieldSite: {
    powderCoat: '#52756b',
    aluminium: '#a9b1ad',
    stainlessSteel: '#d0d9d6',
    polymer: '#263a37',
  },
  highVisibility: {
    powderCoat: '#e6e8e4',
    aluminium: '#c3c9cb',
    stainlessSteel: '#e4e9e6',
    polymer: '#e0aa18',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
// Screw head with its axis along Y, from y0 toward the rack (+Y) over h.
const screwY = (x: number, y0: number, z: number, h: number, r: number) => cylinder(h, r, 12).rotateX(90).translate(x, y0 + h, z).scale(scale);
const profile = (pts: Array<[number, number]>) => {
  let pb = path().moveTo(pts[0]![0], pts[0]![1]);
  for (const [u, v] of pts.slice(1)) pb = pb.lineTo(u, v);
  return pb.close();
};

const W = 440;        // chassis width between the rack rails
const D = 330;        // chassis depth
const H = 133;        // 3U
const FRONT = -D / 2; // chassis front face (y)
const EAR_W = 21.5;   // ear flange: 483 mm across both ears
const T = 3;          // ear sheet thickness
const FACE = 4;       // module face plate thickness
const FY = FRONT - FACE;
// Rack ear seen from above: front flange on the rack rail, side flange bolted to the chassis side.
const ear = (sx: number) => {
  const pts: Array<[number, number]> = [
    [W / 2, FRONT - T], [W / 2 + EAR_W, FRONT - T], [W / 2 + EAR_W, FRONT], [W / 2 + T, FRONT],
    [W / 2 + T, FRONT + 50], [W / 2, FRONT + 50],
  ];
  const side = sx > 0 ? pts : pts.map(([x, y]) => [-x, y] as [number, number]).reverse();
  return profile(side).extrude(H).scale(scale);
};
// Pull handle seen from above: a U loop standing off the module face.
const handle = (cx: number, z: number) =>
  profile([
    [cx - 30, FY], [cx - 22, FY], [cx - 22, FY - 20], [cx + 22, FY - 20], [cx + 22, FY], [cx + 30, FY],
    [cx + 30, FY - 28], [cx - 30, FY - 28],
  ]).extrude(14).translate(0, 0, z).scale(scale);

const CONTROLLER: [number, number] = [-184, 60];
const RECTIFIERS = [-107, -16, 75, 166];
const RECT_W = 88;

const p = assembly("remote-power-shelf");
p.part("chassis", b(0, 0, 0, W, D, H).color(powderCoat));
for (const [id, sx] of [['left', -1], ['right', 1]] as Array<[string, number]>) {
  p.part(`ear-${id}`, ear(sx).color(powderCoat));
  for (const [n, z] of [22, 111].entries()) {
    p.part(`rack-screw-${id}-${n}`, screwY(sx * (W / 2 + EAR_W / 2 + 1), FRONT - T - 5, z, 5, 6).color(stainlessSteel));
  }
}
p.part("controller", b(CONTROLLER[0], FRONT - FACE / 2, 5, CONTROLLER[1], FACE, H - 10).color(aluminium));
p.part("display", b(CONTROLLER[0], FY - 0.5, 82, 44, 1, 26).color(polymer));
for (const [n, z] of [30, 50].entries()) p.part(`port-${n}`, b(CONTROLLER[0], FY - 0.5, z, 16, 1, 12).color(polymer));
for (const [i, cx] of RECTIFIERS.entries()) {
  p.part(`rectifier-${i}`, b(cx, FRONT - FACE / 2, 5, RECT_W, FACE, H - 10).color(aluminium));
  p.part(`handle-${i}`, handle(cx, 14).color(polymer));
  for (let s = 0; s < 5; s++) p.part(`vent-${i}-${s}`, b(cx, FY - 0.5, 60 + s * 12, 64, 1, 5).color(polymer));
}
p.part("terminal-cover", b(0, D / 2 + 10, 20, 240, 20, 60).color(polymer));

return p.model();
