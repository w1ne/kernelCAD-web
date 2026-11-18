// Original kernelCAD low-poly cheese wheel: a faceted, slightly bulging wheel
// with a waxy rind, whole or with a wedge cut out to show the pale paste, and
// optionally the cut wedge standing beside it.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, cut faces -X -Y.

meta({
  name: 'cheese-wheel',
  license: 'CC0-1.0',
  title: 'Cheese wheel',
  description: 'Faceted cheese wheel with a waxed rind, whole or with a wedge cut out showing the pale paste, optionally with the wedge served beside it, for taverns, markets and food pickups. Knobs: cut, size, rind and paste colours.',
  tags: ['cheese', 'wheel', 'wedge', 'gouda', 'cheddar', 'food', 'dairy', 'pickup'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'food', 'market', 'tavern', 'farm', 'medieval', 'indoor'],
  triangleBudget: 280,
});

const cut = param('cut', 'cut', { choices: ['whole', 'cut', 'served'], label: 'Cut' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const rind = param('rind', '#e0962a', { label: 'Rind' });
const paste = param('paste', '#fce9a6', { label: 'Paste' });

presets({
  'red wax': { rind: '#c3282c', paste: '#f4d470' },
  blue: { rind: '#c8c6b2', paste: '#ece6cc' },
});

const s = size.value === 'small' ? 0.6 : size.value === 'large' ? 1.4 : 1;
const R = 160 * s;
const H = 110 * s;
const N = 12;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < N; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / N), r * Math.sin((2 * Math.PI * k) / N));
  return p.close();
};
// Wheel: bevelled top and bottom edges, flat faces.
const wheel = (r: number, h: number, z: number) => ngon(r * 0.92).loft([ngon(r), ngon(r), ngon(r * 0.92)], {
  planes: [0, 0.16, 0.84, 1].map((f) => ({ plane: 'XY' as const, origin: [0, 0, z + f * h] as [number, number, number] })),
  ruled: true,
});
// The cut points between -X and -Y, toward the default view.
const mid = (-125 * Math.PI) / 180;
const half = (24 * Math.PI) / 180;
const sector = (r: number, h: number, z: number, apex: number, k = 3) => {
  const pts: [number, number][] = [[apex * Math.cos(mid), apex * Math.sin(mid)]];
  for (let i = 0; i <= k; i++) {
    const t = mid - half + (2 * half * i) / k;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return extrudePolygon(pts, h).translate(0, 0, z);
};

const c = assembly('cheese-wheel');
if (cut.value === 'whole') {
  c.part('rind', wheel(R, H, 0).color(rind));
} else {
  // Rind shell cut back slightly further than the paste so the paste shows.
  c.part('rind', wheel(R, H, 0).subtract(sector(R * 1.3, H + 20, -10, 0)).color(rind));
  c.part('paste', wheel(R * 0.96, H - 4, 2).subtract(sector(R * 1.3, H + 20, -10, 4 * s)).color(paste));
  if (cut.value === 'served') {
    // The removed wedge stands in front of the wheel, turned to show a cut face.
    const cd = R * 0.62;
    const at = mid + (40 * Math.PI) / 180;
    const place = (sh: ReturnType<typeof sector>) => sh.translate(-cd * Math.cos(mid), -cd * Math.sin(mid), 0)
      .rotateZ(-100).translate(R * 1.3 * Math.cos(at), R * 1.3 * Math.sin(at), 0);
    // Rind all round; the paste pokes just past both cut faces.
    c.part('wedge-rind', place(sector(R, H, 0, 0)).color(rind));
    c.part('wedge-paste', place(sector(R * 0.96, H - 4, 2, -4 * s)).color(paste));
  }
}

return c.model();
