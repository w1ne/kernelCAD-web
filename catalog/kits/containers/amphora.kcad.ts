// Original kernelCAD low-poly amphora: a faceted turned clay body (ruled
// loft of polygon rings) with a painted shoulder band, a narrow neck and two
// bent strap handles; the pointed-toe style stands in a three-legged ring.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, handles on +/-X.

meta({
  name: 'amphora',
  license: 'CC0-1.0',
  title: 'Amphora',
  description: 'Two-handled clay amphora with a swelling belly, painted band and narrow neck, on a flat foot or a pointed toe in a wooden stand. Knobs: style, size, clay, band and stand colours.',
  tags: ['amphora', 'vase', 'jar', 'pottery', 'clay', 'greek', 'roman', 'ancient', 'wine'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'ancient', 'medieval', 'fantasy', 'dungeon', 'market'],
  triangleBudget: 520,
});

const style = param('style', 'foot', { choices: ['foot', 'pointed'], label: 'Style' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const clay = param('clay', '#c0683a', { label: 'Clay' });
const band = param('band', '#2a2420', { label: 'Painted band' });
const stand = param('stand', '#6e4a2c', { label: 'Stand' });

presets({
  'black-figure': { clay: '#d0743c', band: '#1e1a18' },
  pale: { clay: '#d8c09a', band: '#8a4a2a' },
  glazed: { clay: '#2f6a8a', band: '#e8d8a8' },
});

const s = size.value === 'small' ? 0.6 : size.value === 'large' ? 1.35 : 1;
const n = 10;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
const lathe = (rings: [number, number][]) =>
  ngon(rings[0][0]).loft(rings.slice(1).map(([r]) => ngon(r)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

const pointed = style.value === 'pointed';
// Profile as [radius, height] from the bottom of the pot (z0 lifts it into the stand).
const z0 = pointed ? 90 * s : 0;
const prof: [number, number][] = (pointed
  ? [[8, 0], [40, 60], [120, 210], [165, 360], [170, 430], [150, 520], [70, 580]]
  : [[80, 0], [70, 30], [55, 55], [120, 160], [165, 300], [170, 380], [150, 470], [70, 530]]
).map(([r, z]) => [r * s, z * s + z0]);
const shoulderZ = prof[prof.length - 1][1];
const neck: [number, number][] = [[62 * s, shoulderZ - 2], [52 * s, shoulderZ + 110 * s], [75 * s, shoulderZ + 140 * s], [72 * s, shoulderZ + 160 * s]];

const a = assembly('amphora');
a.part('body', lathe([...prof, ...neck]).subtract(ngon(40 * s).extrude(80 * s).translate(0, 0, shoulderZ + 115 * s)).color(clay));
// Painted band around the widest part of the belly.
const bz = prof[prof.length - 3][1];
a.part('band', ngon(171 * s).extrude(40 * s).translate(0, 0, bz + 5 * s).color(band));
a.part('lip-band', ngon(78 * s).extrude(14 * s).translate(0, 0, shoulderZ + 130 * s).color(band));

// Handles: a flat strap from the upper neck out and down onto the shoulder.
const handle = (sx: number) => {
  const pts: [number, number][] = [[50 * s, shoulderZ + 95 * s], [130 * s, shoulderZ + 105 * s], [150 * s, shoulderZ + 60 * s], [125 * s, shoulderZ - 45 * s]];
  const th = 20 * s;
  const outer = pts.map(([x, z]) => [x * sx, z] as [number, number]);
  const inner = pts.map(([x, z], i) => [(x - (i === 0 ? 0 : th)) * sx, z - (i === 3 ? 0 : th)] as [number, number]).reverse();
  const poly = sx > 0 ? [...outer, ...inner] : [...outer, ...inner].reverse();
  return extrudePolygon(poly, 30 * s).rotateX(90).translate(0, 15 * s, 0);
};
a.part('handle-left', handle(-1).color(clay));
a.part('handle-right', handle(1).color(clay));

if (pointed) {
  // Ring stand: a faceted collar on three splayed legs.
  const rr = 95 * s;
  const ringZ = z0 + 70 * s;
  a.part('stand-ring', ngon(rr + 18 * s).extrude(22 * s).subtract(ngon(rr - 6 * s).extrude(60 * s).translate(0, 0, -20 * s)).translate(0, 0, ringZ).color(stand));
  // Legs: flat-footed slanted posts from the floor up to the ring.
  const top = ringZ + 22 * s;
  for (let i = 0; i < 3; i++) {
    a.part(`stand-leg-${i + 1}`, extrudePolygon([[rr + 50 * s, 0], [rr + 78 * s, 0], [rr + 26 * s, top], [rr - 2 * s, top]], 26 * s)
      .rotateX(90).translate(0, 13 * s, 0).rotateZ(120 * i + 90).color(stand));
  }
}

return a.model();
