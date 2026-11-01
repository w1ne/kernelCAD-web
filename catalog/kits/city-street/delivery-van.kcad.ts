// Original kernelCAD low-poly delivery van: a tall panel van body from a side
// profile with a raked windscreen, wrap-round cab glass, a livery stripe,
// bumpers, lights and four faceted wheels. Millimetres, Z up, nose toward +X.

meta({
  name: 'delivery-van',
  license: 'CC0-1.0',
  title: 'Delivery van',
  description: 'High-roof panel delivery van with cab glass, livery stripe, bumpers, lights and wheels. Knobs: body, glass, stripe, tyre, light colours.',
  tags: ['van', 'delivery van', 'panel van', 'courier', 'vehicle', 'truck', 'traffic', 'street'],
  kit: 'city-street',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'street', 'road', 'parking'],
  triangleBudget: 520,
});

const body = param('body', '#f2f2ee', { label: 'Body' });
const glass = param('glass', '#3d5566', { label: 'Glass' });
const stripe = param('stripe', '#2a7fc8', { label: 'Livery stripe' });
const tyre = param('tyre', '#1d1e20', { label: 'Tyres and bumpers' });
const lights = param('lights', '#f4efd0', { label: 'Headlights' });
const tail = param('tail', '#b01a14', { label: 'Tail lights' });

presets({
  post: { body: '#e8b81c', stripe: '#c8261e' },
  parcel: { body: '#5a3a27', stripe: '#e8b81c' },
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

const W = 1980;
const van = assembly('delivery-van');
van.part('body', elev([[-2600, 380], [2550, 380], [2620, 750], [2380, 1250], [1750, 2400], [-2600, 2400]], W).color(body));
van.part('cab-glass', elev([[2420, 1230], [1840, 2300], [1350, 2300], [1350, 1230]], W + 20).color(glass));
van.part('stripe', blk(-2585, -W / 2 - 10, 900, 1300, W / 2 + 10, 1150).color(stripe));
van.part('bumper-front', blk(2540, -W / 2 - 10, 360, 2680, W / 2 + 10, 520).color(tyre));
van.part('bumper-rear', blk(-2680, -W / 2 - 10, 360, -2580, W / 2 + 10, 520).color(tyre));
van.part('door-seam', blk(-2612, -8, 560, -2596, 8, 2300).color(tyre));
for (const side of [-1, 1]) {
  const s = side < 0 ? 'l' : 'r';
  van.part(`headlight-${s}`, blk(2540, side * 760 - 150, 780, 2605, side * 760 + 150, 900).color(lights));
  van.part(`taillight-${s}`, blk(-2615, side * 860 - 90, 700, -2595, side * 860 + 90, 1200).color(tail));
  van.part(`mirror-${s}`, blk(2100, side * (W / 2) - 60, 1500, 2180, side * (W / 2 + 160), 1700).color(tyre));
  for (const [k, x] of [['front', 1750], ['rear', -1700]] as const) {
    van.part(`wheel-${k}-${s}`, wheelAt(x, side * (W / 2 - 110), 360, 240).color(tyre));
    van.part(`hub-${k}-${s}`, wheelAt(x, side * (W / 2 - 100), 160, 240, 6).translate(0, 0, 200).color(body));
  }
}

return van.model();
