// Original kernelCAD low-poly wall torch: an iron wall plate with an arm and
// strut holding a ring, a tilted wooden torch with a cloth-wrapped head and
// layered flames. Meant for wall mounting: the plate's back face is the wall
// side (+Y), the torch leans out to -Y. Millimetres, Z up, plate bottom on
// z = 0, centred on x = y = 0.

meta({
  name: 'wall-torch',
  license: 'CC0-1.0',
  title: 'Wall torch',
  description: 'Wall-mounted dungeon torch: a wooden torch with a wrapped burning head held in an iron ring bracket on a wall plate, lit or burnt out, for castle halls and dungeon corridors. Knobs: plate shape, lit, iron, wood, wrap, flame and core colours.',
  tags: ['wall torch', 'torch', 'sconce', 'dungeon', 'castle', 'medieval', 'fire', 'flame', 'bracket'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'medieval', 'dungeon', 'castle', 'fantasy', 'cave'],
  triangleBudget: 340,
});

const plate = param('plate', 'shield', { choices: ['shield', 'square', 'round'], label: 'Wall plate' });
const lit = param('lit', 'on', { choices: ['on', 'off'], label: 'Lit' });
const iron = param('iron', '#34343a', { label: 'Iron bracket' });
const wood = param('wood', '#6e4a2c', { label: 'Torch handle' });
const wrap = param('wrap', '#4a3a2a', { label: 'Wrapped head' });
const flame = param('flame', '#f07a1e', { label: 'Flame' });
const core = param('core', '#ffd84a', { label: 'Flame core' });

presets({
  rusty: { iron: '#6a4030' },
  'magic-blue': { flame: '#3a7af0', core: '#bfe8ff' },
  cursed: { flame: '#4ac03a', core: '#d8ff8a', iron: '#2a2a30' },
});

const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n: number, rot = 0) =>
  ngon(rs[0][0], n, rot).loft(rs.slice(1).map(([r]) => ngon(r, n, rot)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
// A square bar between two (y, z) points in the YZ plane.
const segYZ = (y0: number, z0: number, y1: number, z1: number, t: number) => {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const a = (Math.atan2(z1 - z0, y1 - y0) * 180) / Math.PI;
  return box(t, len + t, t, true).rotateX(a).translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
};

// Built with the wall at -Y, then turned so the wall side is +Y and the
// torch faces -Y (the front view).
const face = (sh: Shape) => sh.rotateZ(180);
const w = assembly('wall-torch');
const PY = -110; // plate back face (wall side)
const T = 20; // plate thickness
const shape: [number, number][] = plate.value === 'square'
  ? [[-65, 0], [65, 0], [65, 280], [-65, 280]]
  : plate.value === 'round'
    ? Array.from({ length: 10 }, (_, k) => [75 * Math.sin((2 * Math.PI * k) / 10), 140 - 140 * Math.cos((2 * Math.PI * k) / 10)] as [number, number])
    : [[0, 0], [65, 70], [65, 280], [-65, 280], [-65, 70]];
w.part('plate', face(extrudePolygon(shape, T).rotateX(90).translate(0, PY + T, 0)).color(iron));

// Ring holder in front of the plate, held by an arm and a diagonal strut.
const P: [number, number] = [20, 230]; // ring centre (y, z)
w.part('ring', face(ngon(36, 8).extrude(16).subtract(ngon(24, 8).extrude(24).translate(0, 0, -4)).translate(0, P[0], P[1] - 8)).color(iron));
w.part('arm', face(segYZ(PY + T - 5, P[1], P[0] - 30, P[1], 16)).color(iron));
w.part('strut', face(segYZ(PY + T - 5, P[1] - 120, P[0] - 26, P[1] - 4, 12)).color(iron));

// Torch: tapered handle leaning out by 20 degrees, ring around its middle.
const tilt = 20;
const tr = (tilt * Math.PI) / 180;
const L = 210; // local height of the ring along the handle
const at = (z: number): [number, number] => [P[0] + (z - L) * Math.sin(tr), P[1] + (z - L) * Math.cos(tr)];
const lean = (sh: Shape) => sh.rotateX(-tilt).translate(0, P[0] - L * Math.sin(tr), P[1] - L * Math.cos(tr));
w.part('handle', face(lean(rings([[14, 0], [22, 300], [24, 330]], 6))).color(wood));
w.part('head', face(lean(rings([[24, 300], [36, 330], [38, 395], [28, 420]], 7, 0.3))).color(wrap));
const [hy, hz] = at(410);
if (lit.value === 'on') {
  const tongue = (r: number, h: number, x: number, y: number, rot: number) =>
    ngon(r, 5, rot).loft([ngon(r * 1.25, 5, rot + 0.4), ngon(r * 0.1, 5, rot + 0.8)], {
      planes: [
        { plane: 'XY', origin: [x, hy + y, hz - 25] },
        { plane: 'XY', origin: [x * 1.2, hy + y * 1.2, hz - 25 + h * 0.35] },
        { plane: 'XY', origin: [x * 0.5, hy + y * 0.5, hz - 25 + h] },
      ],
      ruled: true,
    });
  for (let i = 0; i < 3; i++) {
    const a = (2 * Math.PI * i) / 3 + 0.4;
    w.part(`flame-${i + 1}`, face(tongue(28, 190 - 35 * i, 22 * Math.cos(a), 22 * Math.sin(a), i)).color(flame));
  }
  w.part('flame-core', face(tongue(30, 230, 0, 0, 0.3)).color(core));
}

return w.model();
