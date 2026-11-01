// Original kernelCAD low-poly drinking fountain: a faceted pedestal on a
// stepped base with a hollow bowl holding water, a spout and an optional dog
// bowl at the foot. Millimetres, Z up.

meta({
  name: 'drinking-fountain',
  license: 'CC0-1.0',
  title: 'Drinking fountain',
  description: 'Park drinking fountain with a faceted pedestal, water-filled bowl, spout and optional dog bowl. Knobs: dog bowl, pedestal, bowl and water colours.',
  tags: ['drinking fountain', 'water fountain', 'fountain', 'water', 'park', 'plaza', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'park', 'plaza'],
  triangleBudget: 300,
});

const dog = param('dog', 'yes', { choices: ['yes', 'no'], label: 'Dog bowl' });
const pedestal = param('pedestal', '#9a9893', { label: 'Pedestal' });
const bowl = param('bowl', '#2f5a48', { label: 'Bowl and spout' });
const water = param('water', '#5fb4dc', { label: 'Water' });

presets({
  steel: { pedestal: '#a9adb0', bowl: '#d8dadc' },
  heritage: { pedestal: '#1f3d2b', bowl: '#b8902f' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const df = assembly('drinking-fountain');
df.part('base', ngon(300, 8, Math.PI / 8).extrude(100).color(pedestal));
df.part('column', ngon(160, 8, Math.PI / 8).loft(ngon(110, 8, Math.PI / 8), { spacing: 760, ruled: true }).translate(0, 0, 95).color(pedestal));
df.part('bowl', ngon(120, 10).loft(ngon(300, 10), { spacing: 150, ruled: true }).translate(0, 0, 850)
  .subtract(ngon(240, 10).extrude(200).translate(0, 0, 965)).color(bowl));
df.part('water', ngon(242, 10).extrude(12).translate(0, 0, 960).color(water));
df.part('spout', ngon(28, 6).loft(ngon(18, 6), { spacing: 120, ruled: true }).translate(0, -150, 950).color(bowl));
if (dog.value === 'yes') {
  df.part('dog-bowl', ngon(110, 8).loft(ngon(170, 8), { spacing: 90, ruled: true }).translate(0, -360, 0)
    .subtract(ngon(120, 8).extrude(100).translate(0, -360, 50)).color(bowl));
  df.part('dog-water', ngon(122, 8).extrude(10).translate(0, -360, 46).color(water));
}

return df.model();
