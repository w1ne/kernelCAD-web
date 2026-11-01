// Original kernelCAD low-poly electric kick scooter: a low deck on two small
// faceted wheels, a raked stem with a T handlebar, grips, a rear fender and a
// side kickstand so it stands parked. Millimetres, Z up, front toward +X.

meta({
  name: 'e-scooter',
  license: 'CC0-1.0',
  title: 'E-scooter',
  description: 'Parked electric kick scooter with deck, raked stem, T handlebar, fender and kickstand. Knobs: body, deck, wheel and grip colours.',
  tags: ['scooter', 'e-scooter', 'kick scooter', 'electric', 'micromobility', 'vehicle', 'rental', 'street'],
  kit: 'city-street',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'street', 'park'],
  triangleBudget: 260,
});

const body = param('body', '#e8e8e4', { label: 'Body' });
const deck = param('deck', '#2a2c2e', { label: 'Deck grip' });
const wheel = param('wheel', '#1b1c1d', { label: 'Wheels' });
const grip = param('grip', '#2fbf5a', { label: 'Grips and accents' });

presets({
  rental: { body: '#2a2c2e', grip: '#f07a1c' },
  red: { body: '#c8261e', grip: '#1e1e1e' },
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
// Straight bar in the XZ plane at depth y, from (x0, z0) to (x1, z1), square section t.
const bar = (x0: number, z0: number, x1: number, z1: number, t: number, y = 0) => {
  const len = Math.hypot(x1 - x0, z1 - z0) + t;
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

const R = 110;
const es = assembly('e-scooter');
for (const [tag, x] of [['rear', -500], ['front', 520]] as const) {
  es.part(`wheel-${tag}`, ngon(R, 10, Math.PI / 2).extrude(50).translate(0, 0, -25).rotateX(90).translate(x, 0, R).color(wheel));
}
es.part('deck', blk(-440, -85, 80, 400, 85, 140).color(body));
es.part('grip-tape', blk(-400, -70, 139, 360, 70, 148).color(deck));
es.part('neck', bar(380, 120, 520, R, 60).color(body));
es.part('stem', bar(520, R, 440, 1080, 50).color(body));
es.part('fender', bar(-610, 180, -430, 200, 30).color(body));
es.part('handlebar', box(50, 520, 40, true).translate(440, 0, 1090).color(body));
for (const side of [-1, 1]) {
  es.part(`grip-${side < 0 ? 'l' : 'r'}`, box(56, 110, 46, true).translate(440, side * 230, 1090).color(grip));
}
es.part('lamp', blk(470, -30, 820, 510, 30, 860).color(grip));
es.part('kickstand', box(24, 180, 20, true).rotateX(25).translate(-150, -150, 52).color(deck));

return es.model();
