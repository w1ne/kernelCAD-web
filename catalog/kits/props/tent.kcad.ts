// Original kernelCAD low-poly tent: a canvas ridge tent (triangular prism
// with a slight sag and open door flaps) on poles with guy pegs, or a round
// pointed medieval pavilion. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, door towards -Y.

meta({
  name: 'tent',
  license: 'CC0-1.0',
  title: 'Tent',
  description: 'Canvas camping ridge tent with an open door and poles, or a round medieval pavilion with a pennant. Knobs: style, canvas, trim, opening and pole colours.',
  tags: ['tent', 'camping', 'camp', 'canvas', 'pavilion', 'shelter', 'medieval', 'military'],
  kit: 'props',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'camp', 'forest', 'medieval', 'fantasy', 'military'],
  triangleBudget: 360,
});

const style = param('style', 'ridge', { choices: ['ridge', 'pavilion'], label: 'Style' });
const canvas = param('canvas', '#c9b98a', { label: 'Canvas' });
const trim = param('trim', '#a83a2c', { label: 'Trim and flaps' });
const inside = param('inside', '#3a3226', { label: 'Opening' });
const poles = param('poles', '#6e4a2c', { label: 'Poles' });

presets({
  army: { canvas: '#5f6b42', trim: '#4a5434' },
  scout: { canvas: '#d87a2a', trim: '#2f5a8a' },
  royal: { style: 'pavilion', canvas: '#f1ead8', trim: '#2f4f9a' },
});

const t = assembly('tent');
if (style.value === 'ridge') {
  const L = 2200;
  const W = 1800;
  const H = 1300;
  // Canvas body: triangle section extruded along Y.
  const tri = (w: number, h: number) => extrudePolygon([[-w / 2, 0], [w / 2, 0], [0, h]], 1);
  t.part('canvas', extrudePolygon([[-W / 2, 0], [W / 2, 0], [0, H]], L).rotateX(90).translate(0, L / 2, 0)
    .subtract(tri(W * 0.5, H * 0.62).scale([1, 1, 300]).rotateX(90).translate(0, -L / 2 + 150, -1))
    .color(canvas));
  t.part('opening', extrudePolygon([[-W * 0.25, 0], [W * 0.25, 0], [0, H * 0.62]], 20).rotateX(90).translate(0, -L / 2 + 160, 0).color(inside));
  // Door flaps folded back to each side.
  for (const sx of [-1, 1]) {
    t.part(`flap-${sx < 0 ? 'left' : 'right'}`, extrudePolygon([[0, 0], [sx * W * 0.32, 0], [sx * W * 0.05, H * 0.66]], 18)
      .rotateX(90).translate(sx * W * 0.1, -L / 2 - 2, 0).color(trim));
  }
  // Poles at both ends rising above the ridge, a ridge trim strip.
  for (const sy of [-1, 1]) t.part(`pole-${sy < 0 ? 'front' : 'back'}`, box(40, 40, H + 140, true).translate(0, sy * (L / 2 + 25), (H + 140) / 2).color(poles));
  t.part('ridge', box(70, L + 20, 40, true).translate(0, 0, H - 10).color(trim));
  // Guy-line pegs: short stakes out from the poles.
  for (const sy of [-1, 1]) {
    const nm = sy < 0 ? 'front' : 'back';
    t.part(`peg-${nm}`, box(40, 40, 120, true).rotateX(sy * 25).translate(0, sy * (L / 2 + 500), 64).color(poles));
    // Guy line from the pole top down to the peg.
    const dy = 500 - 25;
    const dz = H + 120 - 110;
    const ang = (Math.atan2(dz, dy) * 180) / Math.PI;
    t.part(`guy-${nm}`, box(14, Math.hypot(dy, dz), 14, true).rotateX(-sy * ang).translate(0, sy * (L / 2 + 25 + dy / 2), 110 + dz / 2).color(poles));
  }
} else {
  const R = 1400;
  const Hw = 1300;
  const n = 10;
  const ngon = (r: number) => {
    let p = path().moveTo(r, 0);
    for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
    return p.close();
  };
  t.part('canvas', ngon(R).extrude(Hw).color(canvas));
  t.part('roof', ngon(R + 120).loft(ngon(40), { spacing: 1300, ruled: true }).translate(0, 0, Hw - 1).color(trim));
  // Scalloped valance: one pointed flap per wall facet.
  for (let k = 0; k < n; k++) {
    const a0 = (2 * Math.PI * k) / n;
    const a1 = (2 * Math.PI * (k + 1)) / n;
    const rr = R + 110;
    const [x0, y0, x1, y1] = [rr * Math.cos(a0), rr * Math.sin(a0), rr * Math.cos(a1), rr * Math.sin(a1)];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    t.part(`valance-${k + 1}`, extrudePolygon([[0, 0], [len, 0], [len / 2, -220]], 15).rotateX(90).rotateZ(ang).translate(x0, y0, Hw + 10).color(trim));
  }
  t.part('opening', extrudePolygon([[-350, 0], [350, 0], [350, 1000], [0, 1200], [-350, 1000]], 30).rotateX(90).translate(0, -R * Math.cos(Math.PI / n) + 12, 0).color(inside));
  t.part('pole', box(50, 50, 800, true).translate(0, 0, Hw + 1300 + 300).color(poles));
  t.part('pennant', extrudePolygon([[0, 0], [450, -100], [0, -200]], 15).rotateX(90).translate(25, 0, Hw + 1300 + 700).color(trim));
}

return t.model();
