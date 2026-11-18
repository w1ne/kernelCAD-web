// Original kernelCAD low-poly parked car: a faceted lower body and glass
// cabin from side profiles, a roof slab with door pillars, bumpers, lights and
// four faceted wheels. Millimetres, Z up, nose toward +X.

meta({
  name: 'parked-car',
  license: 'CC0-1.0',
  title: 'Parked car',
  description: 'Low-poly family car, sedan or hatchback, with glass cabin, pillars, bumpers, lights and wheels. Knobs: style, body, glass, tyre and light colours.',
  tags: ['car', 'sedan', 'hatchback', 'automobile', 'vehicle', 'parked car', 'traffic', 'street'],
  kit: 'city-street',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'street', 'road', 'parking'],
  triangleBudget: 520,
});

const style = param('style', 'sedan', { choices: ['sedan', 'hatchback'], label: 'Body style' });
const body = param('body', '#c8352b', { label: 'Body' });
const glass = param('glass', '#3d5566', { label: 'Glass' });
const tyre = param('tyre', '#1d1e20', { label: 'Tyres and bumpers' });
const lights = param('lights', '#f4efd0', { label: 'Headlights' });
const tail = param('tail', '#b01a14', { label: 'Tail lights' });

presets({
  taxi: { body: '#f2c418' },
  police: { body: '#f2f2ee', glass: '#2a3540' },
  midnight: { body: '#26364f' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Elevation prism: points are (x, z), extruded w along Y centred on y = 0.
const elev = (pts: [number, number][], w: number) => extrudePolygon(pts, w).translate(0, 0, -w / 2).rotateX(90);
// Wheel with its axle along Y, a facet vertex touching the ground.
const wheelAt = (x: number, y: number, r: number, w: number, s = 10) =>
  ngon(r, s, Math.PI / 2).extrude(w).translate(0, 0, -w / 2).rotateX(90).translate(x, y, r);

const hatch = style.value === 'hatchback';
const car = assembly('parked-car');
car.part('body', elev([[-2200, 330], [2150, 330], [2240, 520], [2200, 780], [-2210, 800], [-2250, 560]], 1780).color(body));
const cabin: [number, number][] = hatch
  ? [[-2150, 790], [1000, 790], [350, 1400], [-1950, 1400]]
  : [[-1600, 790], [1000, 790], [350, 1400], [-1050, 1400]];
car.part('cabin', elev(cabin, 1580).color(glass));
const roof: [number, number][] = hatch
  ? [[-1960, 1390], [345, 1390], [290, 1450], [-1900, 1450]]
  : [[-1060, 1390], [345, 1390], [290, 1450], [-1000, 1450]];
car.part('roof', elev(roof, 1600).color(body));
car.part('pillar-b', blk(-420, -800, 790, -300, 800, 1400).color(body));
if (hatch) car.part('pillar-c', blk(-1500, -800, 790, -1380, 800, 1400).color(body));
car.part('bumper-front', blk(2170, -880, 320, 2290, 880, 450).color(tyre));
car.part('bumper-rear', blk(-2300, -880, 320, -2190, 880, 450).color(tyre));
for (const side of [-1, 1]) {
  const s = side < 0 ? 'l' : 'r';
  car.part(`headlight-${s}`, blk(2180, side * 820 - 140, 600, 2245, side * 820 + 140, 700).color(lights));
  car.part(`taillight-${s}`, blk(-2250, side * 820 - 140, 620, -2205, side * 820 + 140, 720).color(tail));
  for (const [k, x] of [['front', 1380], ['rear', -1380]] as const) {
    car.part(`wheel-${k}-${s}`, wheelAt(x, side * 790, 320, 220).color(tyre));
    car.part(`hub-${k}-${s}`, wheelAt(x, side * 800, 150, 220, 6).translate(0, 0, 170).color(lights));
  }
}

return car.model();
