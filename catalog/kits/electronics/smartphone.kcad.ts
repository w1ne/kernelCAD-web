// Original kernelCAD low-poly smartphone: a chamfered-corner slab with an
// edge-to-edge screen, front camera dot, side buttons and a rear camera
// bump, lying flat or leaning on a desk stand. Millimetres, Z up, base on
// z = 0 centred on x = y = 0. Flat: screen up; on the stand the screen faces -Y.

meta({
  name: 'smartphone',
  license: 'CC0-1.0',
  title: 'Smartphone',
  description: 'Modern touchscreen smartphone with a large screen, side buttons and rear camera bump, lying flat or leaning on a desk stand. Knobs: pose, size, body, screen, camera and stand colours.',
  tags: ['smartphone', 'phone', 'mobile phone', 'cell phone', 'touchscreen', 'device', 'gadget'],
  kit: 'electronics',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'bedroom', 'living-room', 'cafe'],
  triangleBudget: 140,
});

const pose = param('pose', 'stand', { choices: ['flat', 'stand'], label: 'Pose' });
const size = param('size', 'standard', { choices: ['compact', 'standard', 'max'], label: 'Size' });
const body = param('body', '#2a2c30', { label: 'Body' });
const screen = param('screen', '#3a78c2', { label: 'Screen' });
const camera = param('camera', '#121315', { label: 'Camera' });
const standC = param('stand', '#c9ccd1', { label: 'Stand' });

presets({
  white: { body: '#e9e8e4', camera: '#2a2b2e', stand: '#9aa0a8' },
  gold: { body: '#d2b48a', screen: '#e06a4a', stand: '#3a3c40' },
  off: { screen: '#101114' },
});

const sz = size.value === 'compact' ? 0 : size.value === 'max' ? 2 : 1;
const PW = [66, 72, 78][sz];
const PH = [138, 150, 163][sz];
const T = 8;
const c = 9; // corner chamfer
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

// Phone parts in a local frame: lying screen-up, bottom edge on y = 0, back on z = 0.
type Shape = ReturnType<typeof box>;
const outline = (i: number): [number, number][] => [
  [-PW / 2 + c, i], [PW / 2 - c, i], [PW / 2 - i, c], [PW / 2 - i, PH - c], [PW / 2 - c, PH - i], [-PW / 2 + c, PH - i], [-PW / 2 + i, PH - c], [-PW / 2 + i, c],
];
const phone: [string, () => Shape, typeof body][] = [
  ['body', () => extrudePolygon(outline(0), T), body],
  ['screen', () => extrudePolygon(outline(2.5), 1.1).translate(0, 0, T - 0.5), screen],
  ['front-camera', () => blk(-2.5, PH - 10, T, 2.5, PH - 6, T + 1), camera],
  ['buttons', () => blk(PW / 2 - 1, PH * 0.6, 2.5, PW / 2 + 1.2, PH * 0.82, T - 2.5), camera],
];
const p = assembly('smartphone');
if (pose.value === 'flat') {
  for (const [name, make, col] of phone) p.part(name, make().translate(0, -PH / 2, 0).color(col));
} else {
  const a = 72; // lean from horizontal
  const ar = (a * Math.PI) / 180;
  const y0 = -30;
  const zb = 8;
  // Rotating about X by `a` stands the phone up with the screen toward -Y.
  const place = (s: Shape) => s.rotateX(a).translate(0, y0, zb);
  for (const [name, make, col] of phone) p.part(name, place(make()).color(col));
  p.part('rear-camera', place(blk(-PW / 2 + 6, PH - 34, -2.5, -PW / 2 + 28, PH - 8, 0.5)).color(camera));
  // Stand: base plate, front lip and a wedge under the back of the phone.
  const sw = PW * 0.8;
  const L = PH * 0.5;
  p.part('stand-base', blk(-sw / 2, y0 - 22, 0, sw / 2, y0 + L * Math.cos(ar) + 25, zb).color(standC));
  p.part('stand-lip', blk(-sw / 2, y0 - 22, zb - 1, sw / 2, y0 - 10, zb + 12).color(standC));
  const wedge: [number, number][] = [[y0 + 4, zb - 1], [y0 + L * Math.cos(ar) + 6, zb - 1], [y0 + L * Math.cos(ar) + 6, zb + L * Math.sin(ar)]];
  p.part('stand-back', extrudePolygon(wedge, sw * 0.6).rotateX(90).rotateZ(90).translate(-sw * 0.3, 0, 0).color(standC));
}

return p.model();
