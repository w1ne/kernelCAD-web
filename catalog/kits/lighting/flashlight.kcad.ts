// Original kernelCAD low-poly flashlight: a ribbed grip tube with a push
// button, a flared head, a bezel ring and a glowing lens, lying on its side
// or standing on its tail cap. Millimetres, Z up, base on z = 0 centred on
// x = y = 0; lying, the lens points to +X.

meta({
  name: 'flashlight',
  license: 'CC0-1.0',
  title: 'Flashlight',
  description: 'Handheld flashlight torch with a ribbed grip, push button, flared head and glowing lens, lying on its side as a pickup or standing on its tail. Knobs: pose, size, lit, body, bezel, button and lens colours.',
  tags: ['flashlight', 'torch', 'handheld light', 'pickup', 'item', 'survival', 'tool', 'horror'],
  kit: 'lighting',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'camp', 'survival', 'horror', 'construction'],
  triangleBudget: 300,
});

const pose = param('pose', 'lying', { choices: ['lying', 'standing'], label: 'Pose' });
const size = param('size', 'standard', { choices: ['pocket', 'standard', 'large'], label: 'Size' });
const lit = param('lit', 'on', { choices: ['on', 'off'], label: 'Switched on' });
const body = param('body', '#2b2d31', { label: 'Body' });
const bezel = param('bezel', '#a9adb3', { label: 'Bezel and tail cap' });
const button = param('button', '#d83a2a', { label: 'Button' });
const lens = param('lens', '#fff2b0', { label: 'Lens (lit)' });
const lensOff = param('lensOff', '#8a9aa6', { label: 'Lens (off)' });

presets({
  safety: { body: '#f2c21a', bezel: '#2b2d31', button: '#2b2d31' },
  police: { body: '#1a1c22', bezel: '#1a1c22', lens: '#dff0ff' },
  vintage: { body: '#8a2a22', bezel: '#c9a43a', button: '#c9a43a' },
});

const s = size.value === 'pocket' ? 0.6 : size.value === 'large' ? 1.5 : 1;
const N = 8;
const ngon = (r: number, n = N, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n = N) =>
  ngon(rs[0][0] * s, n).loft(rs.slice(1).map(([r]) => ngon(r * s, n)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });

// Built standing along +Z (tail at z = 0, lens at the top), then laid down.
const RH = 27; // bezel radius
const LEN = 205;
const lying = pose.value === 'lying';
const place = (sh: Shape) => (lying ? sh.rotateY(90).translate(-LEN * s / 2, 0, RH * s) : sh);

const f = assembly('flashlight');
f.part('tail', place(rings([[15, 0], [17, 4], [17, 22]])).color(bezel));
// Grip: a tube with three raised knurl bands.
f.part('grip', place(rings([[15.5, 20], [15.5, 135], [17, 150], [24, 172], [24, 180]])).color(body));
for (let i = 0; i < 2; i++) f.part(`band-${i + 1}`, place(ngon(17 * s).extrude(10 * s).translate(0, 0, (55 + 35 * i) * s)).color(body));
f.part('button', place(box(12 * s, 12 * s, 16 * s, true).translate(-16 * s, 0, 120 * s)).color(button));
f.part('bezel', place(rings([[25, 178], [RH, 182], [RH, 198], [23, 200]])).color(bezel));
f.part('lens', place(ngon(23 * s).extrude((lit.value === 'on' ? 7 : 3) * s).translate(0, 0, 198 * s)).color(lit.value === 'on' ? lens : lensOff));

return f.model();
