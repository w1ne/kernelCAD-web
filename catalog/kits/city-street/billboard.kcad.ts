// Original kernelCAD low-poly billboard: a framed 4 x 2 m board on a single
// pole with a catwalk and two lamp arms; the poster is a plain picture of sky,
// ground and a sun disc. No text. Millimetres, Z up, face toward -Y.

meta({
  name: 'billboard',
  license: 'CC0-1.0',
  title: 'Billboard',
  description: 'Roadside billboard on a pole with a catwalk and lamps, showing a plain sky, hill and sun picture. Knobs: height, frame, sky, ground and sun colours.',
  tags: ['billboard', 'advert', 'advertising', 'sign', 'hoarding', 'poster', 'roadside', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'road'],
  triangleBudget: 320,
});

const heightM = param('heightM', '4', { choices: ['3', '4', '6'], label: 'Board height (m)' });
const frame = param('frame', '#3a3f45', { label: 'Frame and pole' });
const sky = param('sky', '#5fb4dc', { label: 'Poster sky' });
const ground = param('ground', '#4f9a3a', { label: 'Poster ground' });
const sun = param('sun', '#f2c418', { label: 'Poster sun' });

presets({
  sunset: { sky: '#e8833a', ground: '#5a3a5a', sun: '#f4e0a0' },
  blank: { sky: '#f2f2ee', ground: '#f2f2ee', sun: '#f2f2ee' },
});

const bz = Number(heightM.value) * 1000;
const W = 4000;
const Hb = 2000;
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

const bb = assembly('billboard');
bb.part('pole', ngon(190, 8, Math.PI / 8).extrude(bz).color(frame));
bb.part('frame', blk(-W / 2 - 100, -150, bz - 100, W / 2 + 100, 150, bz + Hb + 100).color(frame));
bb.part('sky', blk(-W / 2, -160, bz, W / 2, -149, bz + Hb).color(sky));
bb.part('ground', extrudePolygon([[-W / 2, 0], [W / 2, 0], [W / 2, Hb * 0.45], [W * 0.1, Hb * 0.2], [-W * 0.2, Hb * 0.5], [-W / 2, Hb * 0.3]], 14)
  .rotateX(90).translate(0, -158, bz).color(ground));
bb.part('sun', ngon(330, 10).extrude(10).rotateX(90).translate(W * 0.25, -163, bz + Hb * 0.7).color(sun));
bb.part('catwalk', blk(-W / 2, -650, bz - 160, W / 2, -149, bz - 110).color(frame));
for (const side of [-1, 1]) {
  const x = side * W * 0.28;
  bb.part(`lamp-arm-${side < 0 ? 'l' : 'r'}`, blk(x - 25, -700, bz - 120, x + 25, -149, bz - 70).color(frame));
  bb.part(`lamp-${side < 0 ? 'l' : 'r'}`, box(260, 120, 80, true).rotateX(-25).translate(x, -720, bz - 50).color(frame));
}

return bb.model();
