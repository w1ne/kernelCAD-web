// Original kernelCAD low-poly blacksmith's anvil: a waisted side-profile
// body with a heel, a tapering four-sided horn and an optional tree-stump
// stand. Millimetres, Z up, base on z = 0 centred on x = y = 0, horn to -X.

meta({
  name: 'anvil',
  license: 'CC0-1.0',
  title: 'Anvil',
  description: 'Blacksmith anvil with a waisted body, flat face, heel and pointed horn, standing on a log stump or on the floor. Knobs: stand, size, iron, face and stump colours.',
  tags: ['anvil', 'blacksmith', 'forge', 'smithy', 'iron', 'medieval', 'workshop'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'medieval', 'workshop', 'fantasy'],
  triangleBudget: 220,
});

const stand = param('stand', 'stump', { choices: ['stump', 'none'], label: 'Stand' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const iron = param('iron', '#3d4044', { label: 'Iron' });
const face = param('face', '#8d9297', { label: 'Polished face' });
const stump = param('stump', '#7a5534', { label: 'Stump' });

presets({
  rusty: { iron: '#5a3d2c', face: '#8a6a52' },
  fantasy: { iron: '#2f3a52', face: '#c0c8d8', stump: '#5a3e2a' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.3 : 1;
const W = 130 * s; // body width (Y)
const z0 = stand.value === 'stump' ? 520 : 0;

const a = assembly('anvil');
if (stand.value === 'stump') {
  const ngon = (r: number, n = 8) => {
    let p = path().moveTo(r, 0);
    for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
    return p.close();
  };
  a.part('stump', ngon(240).loft([ngon(200), ngon(195)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 80] },
      { plane: 'XY', origin: [0, 0, z0] },
    ],
    ruled: true,
  }).color(stump));
}

// Side profile in (x, z): splayed feet, narrow waist, wide top with a heel.
const prof: [number, number][] = [
  [-150, 0], [150, 0], [150, 30], [95, 60], [80, 150], [190, 175], [215, 245],
  [-130, 245], [-130, 175], [-80, 150], [-95, 60], [-150, 30],
].map(([x, z]) => [x * s, z * s]);
// Body: profile extruded across the width, with the feet wider than the waist.
a.part('body', extrudePolygon(prof, W).rotateX(90).translate(0, W / 2, z0)
  .union(box(300 * s, W * 1.5, 30 * s, true).translate(0, 0, z0 + 15 * s))
  .color(iron));
a.part('face', box(345 * s, W + 4, 12 * s).translate(-130 * s, -W / 2 - 2, z0 + 240 * s).color(face));
// Horn: a four-sided pyramid frustum pointing to -X from the front of the face.
const sq = (h: number) => path().moveTo(-h, -h).lineTo(h, -h).lineTo(h, h).lineTo(-h, h).close();
a.part('horn', sq(W * 0.45).loft(sq(8 * s), { spacing: 190 * s, ruled: true })
  .rotateY(-90).translate(-120 * s, 0, z0 + 200 * s).color(iron));

return a.model();
