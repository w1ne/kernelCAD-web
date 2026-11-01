// Original kernelCAD low-poly café table set: a round bistro table on a cross
// foot with two bistro chairs facing it and an optional parasol through the
// table. Millimetres, Z up.

meta({
  name: 'cafe-table-set',
  license: 'CC0-1.0',
  title: 'Café table set',
  description: 'Outdoor café bistro set: round table, two chairs and an optional parasol. Knobs: chairs, parasol, metal, top and parasol colours.',
  tags: ['cafe', 'café', 'bistro', 'table', 'chair', 'parasol', 'terrace', 'outdoor seating', 'street'],
  kit: 'city-street',
  category: 'furniture',
  origin: 'base',
  compat: ['outdoor', 'street', 'plaza', 'cafe'],
  triangleBudget: 520,
});

const chairs = param('chairs', '2', { choices: ['1', '2', '3'], label: 'Chairs' });
const parasol = param('parasol', 'yes', { choices: ['yes', 'no'], label: 'Parasol' });
const metal = param('metal', '#2a2c2e', { label: 'Metal frames' });
const top = param('top', '#c9a26b', { label: 'Table top and seats' });
const canopy = param('canopy', '#e8e1cf', { label: 'Parasol' });

presets({
  green: { metal: '#1f4a36', top: '#e8e4d6', canopy: '#2f7d4a' },
  red: { canopy: '#c8352b', top: '#f2f0e6' },
});

const nc = Number(chairs.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const cs = assembly('cafe-table-set');
cs.part('table-top', ngon(330, 10).extrude(30).translate(0, 0, 720).color(top));
cs.part('table-post', ngon(28, 6).extrude(712).translate(0, 0, 10).color(metal));
cs.part('table-foot-1', box(560, 50, 20, true).translate(0, 0, 10).color(metal));
cs.part('table-foot-2', box(50, 560, 20, true).translate(0, 0, 10).color(metal));

// A bistro chair facing +X, then spun round the table.
for (let i = 0; i < nc; i++) {
  const rz = 180 + (i - (nc - 1) / 2) * (nc === 3 ? 110 : 180);
  const at = (s: Shape) => s.translate(-640, 0, 0).rotateZ(rz);
  const c = `chair-${i + 1}`;
  cs.part(`${c}-seat`, at(ngon(210, 8, Math.PI / 8).extrude(30).translate(0, 0, 430)).color(top));
  for (const [k, [lx, ly]] of [[-150, -150], [-150, 150], [140, -140], [140, 140]].entries()) {
    cs.part(`${c}-leg-${k + 1}`, at(box(26, 26, 434).translate(lx - 13, ly - 13, 0)).color(metal));
  }
  for (const ly of [-150, 150]) {
    cs.part(`${c}-back-post-${ly < 0 ? 'l' : 'r'}`, at(box(26, 26, 380).translate(-163, ly - 13, 455)).color(metal));
  }
  cs.part(`${c}-back`, at(box(30, 330, 120).translate(-170, -165, 720)).color(top));
}

if (parasol.value === 'yes') {
  cs.part('parasol-pole', ngon(20, 6).extrude(2350).translate(0, 0, 10).color(metal));
  cs.part('parasol-canopy', ngon(1250, 8).loft([ngon(900, 8), ngon(60, 8)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 1950] },
      { plane: 'XY', origin: [0, 0, 2120] },
      { plane: 'XY', origin: [0, 0, 2330] },
    ],
    ruled: true,
  }).color(canopy));
  cs.part('parasol-tip', ngon(30, 6).extrude(80).translate(0, 0, 2320).color(metal));
}

return cs.model();
