// Original kernelCAD low-poly tabletop valve radio: a wooden cabinet (pointed
// cathedral arch or a wide chamfered box) with a cloth speaker grille behind
// wooden fret bars, a tuning dial and bakelite knobs.
// Millimetres, Z up, base on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'retro-radio',
  license: 'CC0-1.0',
  title: 'Retro valve radio',
  description: 'Vintage tabletop valve radio in a wooden cathedral-arch or wide chamfered cabinet with a cloth speaker grille, fret bars, tuning dial and knobs. Knobs: style, wood, grille cloth, dial and knob colours.',
  tags: ['radio', 'valve radio', 'tube radio', 'wireless', 'vintage', 'retro', 'antique', 'cathedral radio'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'retro', 'kitchen', 'bedroom'],
  triangleBudget: 280,
});

const style = param('style', 'cathedral', { choices: ['cathedral', 'tabletop'], label: 'Style' });
const wood = param('wood', '#7a4524', { label: 'Wood' });
const cloth = param('cloth', '#d9c79a', { label: 'Grille cloth' });
const dial = param('dial', '#efdca6', { label: 'Dial' });
const knobs = param('knobs', '#2e2119', { label: 'Knobs' });

presets({
  bakelite: { wood: '#3a2418', cloth: '#b89a6a', knobs: '#1c1410' },
  ivory: { wood: '#e8dcc0', cloth: '#9c4a3a', dial: '#f6eed8', knobs: '#7a5a3a' },
});

const D = 200;
const fy = -D / 2;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Profile in (x, z) extruded toward -Y from face plane `y1` by `d`.
const face = (pts: [number, number][], y1: number, d: number) => extrudePolygon(pts, d).rotateX(90).translate(0, y1, 0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
const knob = (x: number, z: number, r: number) => ngon(r, 8).extrude(16).rotateX(90).translate(x, fy - 2, z);

const r = assembly('retro-radio');
if (style.value === 'cathedral') {
  const W = 330;
  const zs = 210; // spring of the arch
  const H = 420;
  // Pointed arch: two faceted quarter curves meeting at the top.
  const arch = (hw: number, z0: number, zs0: number, top: number) => {
    const pts: [number, number][] = [[-hw, z0], [hw, z0]];
    const n = 4;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * (Math.PI / 2);
      pts.push([hw * Math.cos(a) * (1 - 0.15 * Math.sin(a)), zs0 + (top - zs0) * Math.sin(a)]);
    }
    for (let k = n - 1; k >= 0; k--) {
      const a = (k / n) * (Math.PI / 2);
      pts.push([-hw * Math.cos(a) * (1 - 0.15 * Math.sin(a)), zs0 + (top - zs0) * Math.sin(a)]);
    }
    // Drop the duplicated apex.
    pts.splice(2 + n + 1, 1);
    return pts;
  };
  r.part('plinth', blk(-W / 2 - 12, fy - 10, 0, W / 2 + 12, D / 2 + 6, 30).color(wood));
  r.part('cabinet', face(arch(W / 2, 20, zs, H), D / 2, D).color(wood));
  r.part('grille', face(arch(W / 2 - 42, 170, zs + 10, H - 50), fy + 1, 4).color(cloth));
  // Fret bars over the cloth, tallest in the middle.
  for (const [i, bx] of [-0.5, 0, 0.5].entries()) {
    const x = bx * (W / 2 - 42);
    const top = bx === 0 ? H - 52 : H - 125;
    r.part(`fret-${i}`, blk(x - 7, fy - 8, 165, x + 7, fy + 1, top).color(wood));
  }
  r.part('dial', ngon(34, 10).extrude(8).rotateX(90).translate(0, fy + 1, 100).color(dial));
  for (const x of [-105, 105]) r.part(`knob-${x}`, knob(x, 92, 20).color(knobs));
  r.part('knob-mid', knob(0, 48, 14).color(knobs));
} else {
  const W = 460;
  const H = 270;
  const c = 45;
  r.part('cabinet', face([[-W / 2, 14], [W / 2, 14], [W / 2, H - c], [W / 2 - c, H], [-W / 2 + c, H], [-W / 2, H - c]], D / 2, D).color(wood));
  for (const sx of [-1, 1]) r.part(`foot-${sx}`, blk(sx * (W / 2 - 50) - 30, fy + 20, 0, sx * (W / 2 - 50) + 30, D / 2 - 20, 15).color(knobs));
  // Speaker grille on the left with three horizontal fret bars.
  const gx0 = -W / 2 + 35;
  const gx1 = 10;
  r.part('grille', blk(gx0, fy - 3, 45, gx1, fy + 1, H - 45).color(cloth));
  for (let b = 0; b < 3; b++) {
    const z = 45 + ((b + 1) * (H - 90)) / 4;
    r.part(`fret-${b}`, blk(gx0 - 4, fy - 9, z - 6, gx1 + 4, fy + 1, z + 6).color(wood));
  }
  // Tuning window on the right with a needle, and two knobs below.
  r.part('dial', blk(40, fy - 3, H - 125, W / 2 - 35, fy + 1, H - 50).color(dial));
  r.part('needle', blk(110, fy - 5, H - 120, 115, fy - 1, H - 55).color(knobs));
  for (const x of [80, W / 2 - 75]) r.part(`knob-${x}`, knob(x, 75, 24).color(knobs));
}

return r.model();
