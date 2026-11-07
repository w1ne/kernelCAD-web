// SPDX-License-Identifier: CC0-1.0
// Overhead line gantry, the lattice steel portal where an incoming
// transmission line is dead-ended at the substation fence. What makes it
// one: two tapering four-legged lattice columns on concrete pile caps; a
// square lattice crossbeam spanning the bay; three strain insulator strings
// of cap-and-pin discs pulling the phase conductors out of the yard, each
// with a sagging conductor running away and a down-drop jumper into the
// bay; earth-wire peaks on top of the columns carrying the shield wires;
// climbing step bolts and an anti-climb guard on one leg. Millimetres, Z up,
// ground origin, beam along X, the line leaves towards -Y.
meta({
  name: "substation-overhead-line-gantry",
  license: "CC0-1.0",
  title: "Overhead line gantry",
  description: "Lattice steel line-entry gantry at about real size: two tapering four-legged lattice columns with zig-zag bracing on concrete pile caps, a square lattice crossbeam, earth-wire peaks with shield wires, three strain insulator strings of cap-and-pin discs with yoke plates and arcing horns, sagging phase conductors leaving the yard and down-drop jumpers into the bay, step bolts and an anti-climb guard. Material controls: galvanised lattice steel, foundations, insulator discs, aluminium conductors; weathered, newGalvanised and glass-disc presets.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "gantry", "lattice steel", "line entry", "strain insulator", "dead end", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 9000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#8a969b', { label: 'Galvanized lattice steel' });
const concrete = param('concrete', '#9a9890', { label: 'Concrete pile caps' });
const porcelain = param('porcelain', '#7b4632', { label: 'Insulator discs' });
const conductor = param('conductor', '#b9bec0', { label: 'Aluminium conductors and fittings' });
presets({
  weathered: { galvanizedSteel: '#6f7672', concrete: '#7f7d75', porcelain: '#6a4434', conductor: '#8c8f8c' },
  maintenance: { galvanizedSteel: '#9aa3a6', concrete: '#b1aea3' },
  glassDiscs: { porcelain: '#5f9a8c', galvanizedSteel: '#a3adb1' },
});

const p = assembly("substation-overhead-line-gantry");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising, n flat sides.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Orient a shape built along +Z from the origin so it runs from a towards b.
const aim = (shape, a, b) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const strut = (a, b, w) => aim(blk(-w / 2, -w / 2, 0, w / 2, w / 2, dist(a, b)), a, b);
const wire = (a, b, r) => aim(lathe([[r, 0], [r, dist(a, b)]], 6), a, b);

const colX = 6000;            // column centrelines
const z0 = 400, zTop = 11400;  // column foot and top
const wBase = 1800, wTop = 1000;
const beamZ0 = zTop, beamZ1 = zTop + 1000, beamW = 1000;

// ---- Lattice columns on pile caps ----
const panels = 8;
for (const cx of [-colX, colX]) {
  add(`pile-cap-${cx}`, blk(cx - 1300, -1300, 0, cx + 1300, 1300, z0).color(concrete));
  const half = (z) => (wBase + ((wTop - wBase) * (z - z0)) / (zTop - z0)) / 2;
  const corner = (sx, sy, z) => [cx + sx * half(z), sy * half(z), z];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    add(`column-${cx}-leg-${sx}-${sy}`, strut(corner(sx, sy, z0), corner(sx, sy, zTop), 110).color(galvanizedSteel));
    add(`column-${cx}-foot-${sx}-${sy}`, blk(cx + sx * half(z0) - 160, sy * half(z0) - 160, z0, cx + sx * half(z0) + 160, sy * half(z0) + 160, z0 + 60).color(galvanizedSteel));
  }
  for (let k = 0; k <= panels; k++) {
    const za = z0 + ((zTop - z0) * k) / panels;
    // Horizontals on all four faces.
    for (const [face, a, b] of [['front', [-1, -1], [1, -1]], ['right', [1, -1], [1, 1]], ['back', [1, 1], [-1, 1]], ['left', [-1, 1], [-1, -1]]])
      add(`column-${cx}-h-${k}-${face}`, strut(corner(a[0], a[1], za), corner(b[0], b[1], za), 60).color(galvanizedSteel));
    if (k === panels) break;
    const zb = z0 + ((zTop - z0) * (k + 1)) / panels;
    // One diagonal per face, alternating direction panel to panel (zig-zag).
    const f = k % 2 ? 1 : -1;
    add(`column-${cx}-d-${k}-front`, strut(corner(-f, -1, za), corner(f, -1, zb), 55).color(galvanizedSteel));
    add(`column-${cx}-d-${k}-back`, strut(corner(f, 1, za), corner(-f, 1, zb), 55).color(galvanizedSteel));
    add(`column-${cx}-d-${k}-left`, strut(corner(-1, f, za), corner(-1, -f, zb), 55).color(galvanizedSteel));
    add(`column-${cx}-d-${k}-right`, strut(corner(1, -f, za), corner(1, f, zb), 55).color(galvanizedSteel));
  }
  // Earth-wire peak: a slim pyramid of four legs above the beam.
  const pz0 = beamZ1, pz1 = beamZ1 + 2200;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(`peak-${cx}-${sx}-${sy}`, strut([cx + sx * 450, sy * 450, pz0], [cx + sx * 80, sy * 80, pz1], 70).color(galvanizedSteel));
  for (const z of [pz0 + 700, pz0 + 1400]) add(`peak-${cx}-tie-${z}`, blk(cx - 330 + (z - pz0) * 0.15, -40, z, cx + 330 - (z - pz0) * 0.15, 40, z + 50).color(galvanizedSteel));
  add(`peak-${cx}-cap`, blk(cx - 120, -120, pz1, cx + 120, 120, pz1 + 80).color(galvanizedSteel));
  add(`shield-wire-${cx}`, wire([cx, -120, pz1 + 40], [cx, -9000, pz1 - 1100], 22).color(conductor));
}

// ---- Lattice crossbeam: four chords with verticals and zig-zag diagonals ----
const bx0 = -colX - wTop / 2, bx1 = colX + wTop / 2, bays = 12;
const hw = beamW / 2;
for (const y of [-hw, hw]) for (const z of [beamZ0, beamZ1]) add(`beam-chord-${y}-${z}`, strut([bx0, y, z], [bx1, y, z], 100).color(galvanizedSteel));
for (let k = 0; k <= bays; k++) {
  const x = bx0 + ((bx1 - bx0) * k) / bays;
  add(`beam-frame-${k}-front`, strut([x, -hw, beamZ0], [x, -hw, beamZ1], 55).color(galvanizedSteel));
  add(`beam-frame-${k}-back`, strut([x, hw, beamZ0], [x, hw, beamZ1], 55).color(galvanizedSteel));
  add(`beam-frame-${k}-bottom`, strut([x, -hw, beamZ0], [x, hw, beamZ0], 50).color(galvanizedSteel));
  add(`beam-frame-${k}-top`, strut([x, -hw, beamZ1], [x, hw, beamZ1], 50).color(galvanizedSteel));
  if (k === bays) break;
  const xn = bx0 + ((bx1 - bx0) * (k + 1)) / bays;
  const f = k % 2 === 0;
  add(`beam-diag-${k}-front`, strut([x, -hw, f ? beamZ0 : beamZ1], [xn, -hw, f ? beamZ1 : beamZ0], 50).color(galvanizedSteel));
  add(`beam-diag-${k}-back`, strut([x, hw, f ? beamZ0 : beamZ1], [xn, hw, f ? beamZ1 : beamZ0], 50).color(galvanizedSteel));
  add(`beam-diag-${k}-bottom`, strut([x, f ? -hw : hw, beamZ0], [xn, f ? hw : -hw, beamZ0], 45).color(galvanizedSteel));
}

// ---- Strain insulator strings, conductors and down-drop jumpers ----
const disc = lathe([[60, 0], [140, 20], [140, 45], [55, 110], [30, 150]], 10);
const discs = 10, pitch = 150;
[-3600, 0, 3600].forEach((x, i) => {
  const n = `phase-${i + 1}`;
  const a = [x, -hw - 60, beamZ0 + 250];
  const dir = [0, -0.985, -0.17]; // string axis: out of the yard, slightly down
  const at = (t) => [a[0] + dir[0] * t, a[1] + dir[1] * t, a[2] + dir[2] * t];
  add(`${n}-attachment-plate`, blk(x - 120, -hw - 80, beamZ0 + 120, x + 120, -hw + 10, beamZ0 + 380).color(galvanizedSteel));
  add(`${n}-shackle`, strut(a, at(220), 40).color(conductor));
  add(`${n}-yoke`, aim(blk(-180, -25, 0, 180, 25, 60), at(220), at(300)).color(conductor));
  for (let k = 0; k < discs; k++) add(`${n}-disc-${k}`, aim(disc, at(300 + k * pitch), at(400 + k * pitch)).color(porcelain));
  const tEnd = 300 + discs * pitch;
  add(`${n}-line-horn`, strut(at(tEnd - 80), [x + 260, at(tEnd)[1], at(tEnd)[2] + 260], 22).color(conductor));
  add(`${n}-ground-horn`, strut(at(320), [x + 260, at(320)[1], at(320)[2] + 260], 22).color(conductor));
  add(`${n}-dead-end-clamp`, strut(at(tEnd), at(tEnd + 350), 70).color(conductor));
  // Sagging phase conductor leaving the yard: chord segments of a shallow catenary.
  const c0 = at(tEnd + 350);
  let prev = c0;
  for (let s = 1; s <= 5; s++) {
    const y = c0[1] - s * 1300;
    const pt = [x, y, c0[2] - 140 * s + 12 * s * s];
    add(`${n}-conductor-${s}`, wire(prev, pt, 36).color(conductor));
    prev = pt;
  }
  // Down-drop jumper from the clamp into the bay.
  const j0 = at(tEnd + 200);
  const j1 = [x, j0[1] + 500, j0[2] - 1200];
  const j2 = [x, j0[1] + 1600, j0[2] - 2500];
  const j3 = [x, j0[1] + 2200, 6200];
  add(`${n}-jumper-1`, wire(j0, j1, 32).color(conductor));
  add(`${n}-jumper-2`, wire(j1, j2, 32).color(conductor));
  add(`${n}-jumper-3`, wire(j2, j3, 32).color(conductor));
  add(`${n}-jumper-spacer`, blk(x - 60, j1[1] - 60, j1[2] - 40, x + 60, j1[1] + 60, j1[2] + 40).color(conductor));
});

// ---- Step bolts and anti-climb guard on one leg ----
const halfAt = (z) => (wBase + ((wTop - wBase) * (z - z0)) / (zTop - z0)) / 2;
for (let z = 2600; z < zTop - 300; z += 400) {
  const h = halfAt(z);
  add(`step-bolt-${z}`, blk(-colX - h - 200, -h - 15, z - 15, -colX - h, -h + 15, z + 15).color(galvanizedSteel));
}
const g = halfAt(2200) + 250;
for (const s of [-1, 1]) {
  add(`anti-climb-guard-x-${s}`, blk(-colX - g, s * g - 30, 2200, -colX + g, s * g + 30, 2260).color(galvanizedSteel));
  add(`anti-climb-guard-y-${s}`, blk(-colX + s * g - 30, -g, 2200, -colX + s * g + 30, g, 2260).color(galvanizedSteel));
}
add('danger-plate', blk(-colX - 200, -wBase / 2 - 100, 1600, -colX + 200, -wBase / 2 - 80, 1900).color('#e0b02a'));

return p.model();
