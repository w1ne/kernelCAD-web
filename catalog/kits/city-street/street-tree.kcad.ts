// Original kernelCAD low-poly street tree: a young tree in a square pavement
// pit with an iron tree grate and an optional guard of upright bars held by
// two rings. Millimetres, Z up, grate top 40 mm above z = 0.

meta({
  name: 'street-tree',
  license: 'CC0-1.0',
  title: 'Street tree with guard',
  description: 'Young pavement tree in an iron tree grate with an optional barred tree guard and a lumpy crown. Knobs: height, guard, grate, guard, bark and leaf colours.',
  tags: ['tree', 'street tree', 'tree guard', 'tree grate', 'sidewalk', 'pavement', 'avenue', 'street'],
  kit: 'city-street',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'street', 'park'],
  triangleBudget: 560,
});

const heightM = param('heightM', '5', { choices: ['4', '5', '6'], label: 'Height (m)' });
const guard = param('guard', 'yes', { choices: ['yes', 'no'], label: 'Tree guard' });
const grate = param('grate', '#3a3c3f', { label: 'Grate' });
const metal = param('metal', '#1f3d2b', { label: 'Guard' });
const bark = param('bark', '#6b4a2f', { label: 'Bark' });
const leaves = param('leaves', '#5a9a3f', { label: 'Leaves' });

presets({
  autumn: { leaves: '#d68a2e' },
  black: { metal: '#1e1e1e' },
});

const h = Number(heightM.value) * 1000;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blob = (x: number, y: number, z: number, r: number, hh: number, s: number) =>
  ngon(r * 0.5, s).loft([ngon(r, s, Math.PI / s), ngon(r * 0.8, s), ngon(r * 0.3, s, Math.PI / s)], {
    planes: [
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + hh * 0.35] },
      { plane: 'XY', origin: [x, y, z + hh * 0.72] },
      { plane: 'XY', origin: [x, y, z + hh] },
    ],
    ruled: true,
  });

const st = assembly('street-tree');
// Square grate with a central opening, divided by two cross bars per side.
st.part('grate', box(1200, 1200, 40).translate(-600, -600, 0)
  .subtract(ngon(200, 8, Math.PI / 8).extrude(60).translate(0, 0, -10))
  .subtract(box(900, 120, 60).translate(-450, 260, -10))
  .subtract(box(900, 120, 60).translate(-450, -380, -10))
  .color(grate));
st.part('trunk', ngon(90, 6).loft(ngon(55, 6), { spacing: h * 0.55, ruled: true }).color(bark));
const cr = h * 0.17;
st.part('crown-low', blob(0, 0, h * 0.42, cr * 1.15, h * 0.32, 7).color(leaves));
st.part('crown-top', blob(0, 0, h * 0.66, cr, h * 0.34, 7).color(leaves));
st.part('crown-side', blob(cr * 0.8, -cr * 0.4, h * 0.5, cr * 0.75, h * 0.26, 6).color(leaves));

if (guard.value === 'yes') {
  const gr = 300;
  const ring = (z: number) => ngon(gr + 22, 8).extrude(30).subtract(ngon(gr - 8, 8).extrude(50).translate(0, 0, -10)).translate(0, 0, z);
  st.part('guard-ring-low', ring(500).color(metal));
  st.part('guard-ring-high', ring(1450).color(metal));
  for (let k = 0; k < 8; k++) {
    const a = (2 * Math.PI * k) / 8;
    st.part(`guard-bar-${k + 1}`, ngon(14, 4).extrude(1600).translate(gr * Math.cos(a), gr * Math.sin(a), 20).color(metal));
  }
}

return st.model();
