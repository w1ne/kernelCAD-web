// Original kernelCAD low-poly tulip bed: a raised soil bed planted with rows
// of tulips, each a thin stem, a strap leaf and a cup of pointed petals.
// The bed runs along X, centred, base on z = 0.

meta({
  name: 'tulip-bed',
  license: 'CC0-1.0',
  title: 'Tulip bed',
  description: 'Raised garden bed of tulips in rows, each with a strap leaf and a pointed cup flower. Knobs: rows, tulips per row (up to 12), flower, leaf and soil colours.',
  tags: ['tulip', 'tulips', 'flower bed', 'flowers', 'garden', 'spring', 'park', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'park', 'street'],
  triangleBudget: 600,
});

const rows = param('rows', '2', { choices: ['1', '2'], label: 'Rows' });
const perRow = param('perRow', '4', { choices: ['3', '4', '5', '6'], label: 'Tulips per row' });
const flowers = param('flowers', '#e0393e', { label: 'Flowers' });
const leaves = param('leaves', '#4f8f3c', { label: 'Leaves and stems' });
const soil = param('soil', '#5a3f2c', { label: 'Soil' });

presets({
  yellow: { flowers: '#f2c62a' },
  pink: { flowers: '#ec8bb4' },
  purple: { flowers: '#6b3f9e' },
});

const nr = Number(rows.value);
const nc = Number(perRow.value);
const pitch = 180;
const L = nc * pitch + 120;
const D = nr * pitch + 100;
const bedH = 90;
const stemH = 330;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Six-pointed top ring: alternating petal tips and notches.
const crown = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < 6; k++) {
    const a = (Math.PI * k) / 3;
    const rr = k % 2 === 0 ? r : r * 0.78;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};

const bed = assembly('tulip-bed');
// Bevelled soil mound: a loft from the full footprint to a smaller top.
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
bed.part('soil', rect(L, D).loft(rect(L - 80, D - 80), { spacing: bedH, ruled: true }).color(soil));

for (let r = 0; r < nr; r++) {
  for (let c = 0; c < nc; c++) {
    const i = r * nc + c;
    const x = -L / 2 + 60 + pitch * (c + 0.5) + (r % 2) * 40 - 20;
    const y = -D / 2 + 50 + pitch * (r + 0.5);
    const sh = stemH * (0.88 + 0.14 * Math.sin(i * 2.7));
    const lean = 6 * Math.sin(i * 1.3);
    const base = bedH - 20;
    bed.part(`stem-${i + 1}`, ngon(6, 3).extrude(sh).rotateY(lean).translate(x, y, base).color(leaves));
    if (i % 2 === 0) bed.part(`leaf-${i + 1}`, extrudePolygon([[-22, 0], [22, 0], [10, sh * 0.55], [0, sh * 0.65]], 6)
      .rotateX(90).rotateX(-12).rotateZ(i * 67).translate(x, y, base).color(leaves));
    // Cup: narrow base, wide shoulder, pointed six-tip mouth.
    const cup = ngon(16, 6).loft([ngon(36, 6, Math.PI / 6), crown(32)], {
      planes: [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, 32] },
        { plane: 'XY', origin: [0, 0, 78] },
      ],
      ruled: true,
    });
    bed.part(`tulip-${i + 1}`, cup.translate(0, 0, sh - 8).rotateY(lean).rotateZ(i * 23).translate(x, y, base).color(flowers));
  }
}

return bed.model();
