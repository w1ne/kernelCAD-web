// Original kernelCAD low-poly wall clock: a faceted round rim around a pale
// face with twelve hour markers, hour and minute hands and a centre cap.
// Origin 'wall': the back sits on the y = 0 wall plane, the clock projects
// toward -Y, centred on x = 0 with its centre at z = 0. Millimetres, Z up.

meta({
  name: 'wall-clock',
  license: 'CC0-1.0',
  title: 'Wall clock',
  description: 'Round wall clock with a rim, twelve hour markers and hour and minute hands set to a chosen time. Knobs: diameter, time, rim, face and hand colours.',
  tags: ['wall clock', 'clock', 'time', 'kitchen clock', 'office clock', 'wall', 'decor'],
  kit: 'interior',
  category: 'attachment',
  origin: 'wall',
  compat: ['indoor', 'kitchen', 'office', 'school', 'living-room'],
  triangleBudget: 300,
});

const diameter = param('diameter', '300', { choices: ['250', '300', '400'], label: 'Diameter (mm)' });
const time = param('time', '10:10', { choices: ['10:10', '3:00', '7:30', '12:45'], label: 'Time shown' });
const rim = param('rim', '#2b2d30', { label: 'Rim' });
const face = param('face', '#f4f3ef', { label: 'Face' });
const hands = param('hands', '#1d1f22', { label: 'Hands and markers' });

presets({
  wood: { rim: '#8a6040', face: '#efe6d2' },
  red: { rim: '#b8342c' },
  brass: { rim: '#c9a24a', face: '#232323', hands: '#c9a24a' },
});

const R = Number(diameter.value) / 2;
const [hh, mm] = time.value.split(':').map(Number);
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};
// A flat piece in the XZ plane (clock face plane), standing proud from y0 by t.
const plate = (pts: [number, number][], y0: number, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0, 0);
const disc = (r: number, s: number, y0: number, t: number) => ngon(r, s).extrude(t).rotateX(90).translate(0, y0, 0);

const c = assembly('wall-clock');
const sides = 12;
// The rim is a full disc; the face sits just proud of its front, leaving a border.
c.part('rim', disc(R, sides, 0, 40).color(rim));
c.part('face', disc(R - 18, sides, -39, 5).color(face));
// Hour markers: long at 12/3/6/9, short elsewhere.
for (let i = 0; i < 12; i++) {
  const a = (Math.PI / 2) - (2 * Math.PI * i) / 12;
  const long = i % 3 === 0;
  const r0 = R - 30 - (long ? 28 : 14);
  const r1 = R - 30;
  const w = long ? 6 : 3.5;
  const ux = Math.cos(a);
  const uz = Math.sin(a);
  const pts: [number, number][] = [
    [r0 * ux - w * uz, r0 * uz + w * ux], [r1 * ux - w * uz, r1 * uz + w * ux],
    [r1 * ux + w * uz, r1 * uz - w * ux], [r0 * ux + w * uz, r0 * uz - w * ux],
  ];
  c.part(`marker-${i + 1}`, plate(pts, -43, 4).color(hands));
}
// Hands: tapered blades pointing up, then turned to the time about the
// clock's axis (Y, facing the viewer at -Y).
const hand = (len: number, w: number) => [[-w, -len * 0.15], [w, -len * 0.15], [w * 0.6, len], [-w * 0.6, len]] as [number, number][];
const minDeg = (mm / 60) * 360;
const hourDeg = (((hh % 12) + mm / 60) / 12) * 360;
c.part('hour-hand', plate(hand(R * 0.5, 7), 0, 4).rotateY(hourDeg).translate(0, -46, 0).color(hands));
c.part('minute-hand', plate(hand(R * 0.75, 5), 0, 4).rotateY(minDeg).translate(0, -50, 0).color(hands));
c.part('cap', disc(10, 6, -53, 8).color(rim));

return c.model();
