// Original kernelCAD low-poly portable stereo: a chamfered body with two
// round speakers, a central cassette deck (single or twin), a tuning strip,
// top buttons and a carry handle. Millimetres, Z up, base on z = 0 centred
// on x = y = 0. Speakers face -Y.

meta({
  name: 'boombox',
  license: 'CC0-1.0',
  title: 'Boombox',
  description: 'Retro portable stereo boombox with two round speakers, a single or twin cassette deck, tuning strip, top buttons and a carry handle. Knobs: deck, body, speaker, trim and deck colours.',
  tags: ['boombox', 'ghetto blaster', 'stereo', 'cassette player', 'radio', 'speakers', 'retro', 'music'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'retro', 'bedroom', 'street', 'living-room'],
  triangleBudget: 480,
});

const decks = param('decks', 'twin', { choices: ['single', 'twin'], label: 'Cassette decks' });
const body = param('body', '#2c2e32', { label: 'Body' });
const speaker = param('speaker', '#17181a', { label: 'Speakers' });
const trim = param('trim', '#b8bcc2', { label: 'Trim' });
const deck = param('deck', '#50555c', { label: 'Deck' });

presets({
  silver: { body: '#b9bdc2', trim: '#2c2e31', speaker: '#2a2b2e', deck: '#8a8f96' },
  red: { body: '#b4302a', trim: '#e6e6e2', deck: '#3a3c40' },
});

const twin = decks.value === 'twin';
const R = 92; // speaker radius
const cw = twin ? 300 : 150; // centre section width
const W = 4 * R + cw + 70;
const D = 150;
const H = 280;
const fy = -D / 2;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const b = assembly('boombox');
// Body: side profile with a sloped top-front edge, extruded across the width.
b.part('body', extrudePolygon([[-D / 2, 12], [D / 2, 12], [D / 2, H], [-D / 2 + 30, H], [-D / 2, H - 30]], W)
  .rotateX(90).rotateZ(90).translate(-W / 2, 0, 0).color(body));
for (const sx of [-1, 1]) b.part(`foot-${sx}`, blk(sx * (W / 2 - 70) - 45, fy + 15, 0, sx * (W / 2 - 70) + 45, D / 2 - 15, 13).color(speaker));
// Speakers: trim ring, cone and dust cap.
const sz = 12 + (H - 30 - 12) / 2 - 8;
for (const sx of [-1, 1]) {
  const x = sx * (W / 2 - R - 25);
  b.part(`ring-${sx}`, ngon(R, 10).extrude(6).rotateX(90).translate(x, fy + 1, sz).color(trim));
  b.part(`cone-${sx}`, ngon(R - 10, 10).loft(ngon(R * 0.3, 10), { spacing: 22, ruled: true }).rotateX(90).translate(x, fy - 4, sz).color(speaker));
  b.part(`cap-${sx}`, ngon(R * 0.2, 6).extrude(8).rotateX(90).translate(x, fy - 20, sz).color(trim));
}
// Cassette deck(s) with windows, below a tuning strip.
const nd = twin ? 2 : 1;
const dw = (cw - 20 * (nd + 1)) / nd;
for (let d = 0; d < nd; d++) {
  const x0 = -cw / 2 + 20 + d * (dw + 20);
  b.part(`deck-${d}`, blk(x0, fy - 4, 40, x0 + dw, fy + 1, 160).color(deck));
  b.part(`window-${d}`, blk(x0 + dw * 0.2, fy - 7, 90, x0 + dw * 0.8, fy - 3, 130).color(speaker));
}
b.part('tuner', blk(-cw / 2 + 10, fy - 4, 180, cw / 2 - 10, fy + 1, 220).color(trim));
b.part('needle', blk(-10, fy - 7, 184, -4, fy - 3, 216).color(speaker));
// Piano-key buttons on top, and the carry handle.
const nb = twin ? 8 : 5;
for (let k = 0; k < nb; k++) {
  const x = -cw / 2 + 20 + ((cw - 40) * (k + 0.5)) / nb;
  b.part(`button-${k}`, blk(x - (cw - 40) / nb / 2 + 3, -D / 2 + 34, H - 1, x + (cw - 40) / nb / 2 - 3, -D / 2 + 70, H + 10).color(trim));
}
const hx = W / 2 - 60;
for (const sx of [-1, 1]) b.part(`post-${sx}`, blk(sx * hx - 16, 10, H - 1, sx * hx + 16, 40, H + 70).color(trim));
b.part('handle', blk(-hx - 16, 8, H + 60, hx + 16, 42, H + 88).color(trim));

return b.model();
