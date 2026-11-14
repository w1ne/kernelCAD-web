// SPDX-License-Identifier: CC0-1.0
// Veterinary surgery table, the lift table an animal lies on during an
// operation. What makes one: a stainless top split along its length into two
// hinged leaves that tilt up into a V to cradle the patient on its back, with
// upturned edges, tie-down cleats for limb ropes and a drain at one end that
// runs into a hanging bucket; under it a tilt head on a telescoping lift
// column with a painted cover, standing on a heavy chamfered base with foot
// pedals for up and down.
// The top choice shows the leaves tilted into a V or laid flat.
// Millimetres, Z up, long axis on X, drain end on +X.
meta({
  name: "veterinary-surgery-table",
  license: 'CC0-1.0',
  title: "Veterinary surgery table",
  description: "Veterinary operating table at real size: two hinged stainless top leaves with upturned edges that tilt into a V cradle, limb tie-down cleats, end drain with hose to a hanging stainless bucket, tilt head on a two-stage telescoping lift column with painted cover, heavy chamfered base and rubber foot pedals. Top choice (vTop, flat) tilts or flattens the leaves. Material controls: top steel, column cover, base paint and rubber. clinicClean, softTeal and graphite presets.",
  tags: ["veterinary", "animal clinic", "surgery", "operating table", "v-top", "lift table", "stainless", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const top = param('top', 'vTop', { choices: ['vTop', 'flat'], label: 'Table top' });
const topSteel = param('topSteel', '#c3cbcd', { label: 'Top stainless steel' });
const columnCover = param('columnCover', '#e7eae8', { label: 'Column cover' });
const basePaint = param('basePaint', '#56636b', { label: 'Base paint' });
const rubber = param('rubber', '#26292b', { label: 'Rubber' });

presets({
  clinicClean: { columnCover: '#f3f4f2', basePaint: '#9aa5aa' },
  softTeal: { columnCover: '#7fb0b2', basePaint: '#3f6d72' },
  graphite: { topSteel: '#a8b0b2', columnCover: '#4a5054', basePaint: '#2c3134', rubber: '#1b1d1e' },
});

const p = assembly("veterinary-surgery-table");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const tube = (a: number[], b: number[], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return cylinder(len, r, seg)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Profile in (x, z), extruded across y0..y1.
const prismY = (pts: number[][], y0: number, y1: number) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, z] of pts.slice(1)) pb = pb.lineTo(x, z);
  return pb.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
// Octagonal column section, half widths a (X) and b (Y), chamfer c.
const column = (a: number, b: number, c: number, z0: number, z1: number) =>
  path().moveTo(-a + c, -b).lineTo(a - c, -b).lineTo(a, -b + c).lineTo(a, b - c).lineTo(a - c, b)
    .lineTo(-a + c, b).lineTo(-a, b - c).lineTo(-a, -b + c).close().extrude(z1 - z0).translate(0, 0, z0);
const turned = (pts: [number, number][], seg = 18) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

// ---- Base and pedals ----
add('base', prismY([[-470, 0], [470, 0], [470, 35], [390, 100], [-390, 100], [-470, 35]], -290, 290).color(basePaint));
for (const s of [-1, 1]) add(`base-glide-${s < 0 ? 'left' : 'right'}`, blk(-460, s * 270 - 20, 0, 460, s * 270 + 20, 8).color(rubber));
for (const [k, y] of [-150, -40].entries()) {
  add(`pedal-arm-${k}`, blk(460, y - 18, 30, 560, y + 18, 50).color(basePaint));
  add(`pedal-${k}`, blk(540, y - 45, 35, 640, y + 45, 65).color(rubber));
}
add('pedal-guard', tube([470, -230, 40], [690, -100, 40], 12, 8).color(topSteel));

// ---- Telescoping lift column and tilt head ----
add('column-lower', column(170, 145, 40, 100, 520).color(columnCover));
add('column-collar', column(178, 153, 42, 505, 535).color(basePaint));
add('column-upper', column(135, 112, 30, 535, 740).color(topSteel));
add('tilt-head', blk(-330, -130, 740, 330, 130, 790).color(basePaint));
add('hinge-rod', cylX(-610, 0, 812, 1220, 20).color(topSteel));
for (const x of [-560, 0, 560]) add(`hinge-knuckle-${x}`, cylX(x - 40, 0, 812, 80, 28).color(topSteel));

// ---- Top leaves ----
const tilt = top.value === 'vTop' ? 14 : 0;
// Leaf on -Y (side -1) or +Y (side 1): plate, upturned outer edge, cleats.
for (const side of [-1, 1]) {
  const L = (s: Shape) => s.rotateX(side * tilt).translate(0, 0, 812);
  const yo = side * 320;
  const leaf = blk(-620, 0, -6, 620, yo, 10);
  add(`leaf-${side}`, L(leaf).color(topSteel));
  add(`leaf-edge-${side}`, L(blk(-620, yo - side * 14, 10, 620, yo, 50)).color(topSteel));
  add(`leaf-end-head-${side}`, L(blk(-620, 0, 10, -606, yo, 40)).color(topSteel));
  for (const [k, x] of [-470, -150, 150, 470].entries()) {
    add(`cleat-${side}-${k}`, L(blk(x - 30, yo - side * 6, 30, x + 30, yo + side * 20, 46)).color(rubber));
    add(`cleat-post-${side}-${k}`, L(blk(x - 6, yo - side * 2, 16, x + 6, yo + side * 20, 46)).color(rubber));
  }
  // Leaf support struts down to the tilt head.
  add(`strut-${side}`, tube([-200, side * 120, 790], [-200, side * 250, 812 + 250 * Math.tan((tilt * Math.PI) / 180) - 8], 12, 8).color(topSteel));
  add(`strut-b-${side}`, tube([200, side * 120, 790], [200, side * 250, 812 + 250 * Math.tan((tilt * Math.PI) / 180) - 8], 12, 8).color(topSteel));
}

// ---- Drain and bucket ----
add('drain-funnel', turned([[20, 0], [55, 40], [55, 52], [0, 52], [0, 40], [14, 0]], 14).translate(560, 0, 760).color(topSteel));
add('drain-hose', tube([560, 0, 762], [600, 0, 640], 14, 10).color('#9fb3b6'));
add('drain-hose-lower', tube([600, 0, 640], [700, 0, 590], 14, 10).color('#9fb3b6'));
add('bucket-hook', blk(612, -12, 640, 650, 12, 790).color(topSteel));
add('bucket', turned([[0, 0], [110, 0], [130, 230], [122, 230], [104, 12], [0, 12]], 20).translate(740, 0, 380).color(topSteel));
add('bucket-handle', tube([620, 0, 640], [740, 0, 700], 6, 6).color(topSteel));

return p.model();
