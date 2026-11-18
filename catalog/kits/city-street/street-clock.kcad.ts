// Original kernelCAD low-poly street clock: a two-faced clock head on a fluted
// column with a stepped plinth and a pointed finial. Hands and quarter marks
// are flush blocks; set the shown time with a knob. Millimetres, Z up.

meta({
  name: 'street-clock',
  license: 'CC0-1.0',
  title: 'Street clock',
  description: 'Post-mounted town square clock with two faces, quarter marks and hands on a tapered column. Knobs: shown time, case, face and hands colours.',
  tags: ['clock', 'street clock', 'post clock', 'town square', 'plaza', 'time', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'plaza'],
  triangleBudget: 450,
});

const time = param('time', '10:10', { choices: ['10:10', '12:00', '3:45', '7:20'], label: 'Time shown' });
const casing = param('casing', '#1f3d2b', { label: 'Case and column' });
const face = param('face', '#f4f1e6', { label: 'Clock face' });
const hands = param('hands', '#1b1c1d', { label: 'Hands and marks' });

presets({
  black: { casing: '#1b1c1d', hands: '#b8902f' },
  brass: { casing: '#9a7a2f', face: '#f4f1e6' },
});

const [hh, mm] = time.value.split(':').map(Number) as [number, number];
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Disc in the XZ plane (faces ±Y) centred at (0, y, z).
const disc = (r: number, t: number, y: number, z: number) =>
  ngon(r, 12, Math.PI / 12).extrude(t).translate(0, 0, -t / 2).rotateX(90).translate(0, y, z);

const cz = 3150;
const sc = assembly('street-clock');
sc.part('plinth', ngon(260, 8, Math.PI / 8).loft(ngon(160, 8, Math.PI / 8), { spacing: 380, ruled: true }).color(casing));
sc.part('column', ngon(95, 8, Math.PI / 8).loft(ngon(70, 8, Math.PI / 8), { spacing: 2400, ruled: true }).translate(0, 0, 370).color(casing));
sc.part('collar', ngon(130, 8, Math.PI / 8).extrude(120).translate(0, 0, 2740).color(casing));
sc.part('case', disc(380, 220, 0, cz).color(casing));
sc.part('finial', ngon(90, 6).loft(ngon(6, 6), { spacing: 260, ruled: true }).translate(0, 0, cz + 360).color(casing));

for (const side of [-1, 1]) {
  const y = side * 112;
  const tag = side < 0 ? 'front' : 'back';
  sc.part(`face-${tag}`, disc(310, 10, y, cz).color(face));
  // Clockwise as seen from outside: mirror the angle on the back face.
  const hand = (len: number, w: number, deg: number) =>
    box(w, 10, len).translate(-w / 2, -5, -20).rotateY(side * deg).translate(0, side * 120, cz);
  sc.part(`hour-${tag}`, hand(180, 34, (hh % 12) * 30 + mm * 0.5).color(hands));
  sc.part(`minute-${tag}`, hand(270, 22, mm * 6).color(hands));
  for (let q = 0; q < 4; q++) {
    sc.part(`mark-${tag}-${q + 1}`, box(26, 10, 60).translate(-13, -5, 230).rotateY(q * 90).translate(0, side * 118, cz).color(hands));
  }
}

return sc.model();
