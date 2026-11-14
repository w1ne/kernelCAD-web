// SPDX-License-Identifier: CC0-1.0
// Leather passport wallet. What makes it one rather than a flat sheet: a
// folded leather cover with a rounded spine and stitched edges, and inside it
// the travel layout - the passport tucked into a sleeve on the left with its
// burgundy cover and gold crest showing, a boarding pass in the tall pocket
// behind it, and three stepped card slots plus a pen loop on the right.
// Closed, it shows the embossed cover with a snap tab across the fore edge.
// Generic visualization geometry at real size (closed 105 x 140 x 16 mm),
// millimetres, Z up, lying on z = 0, spine along Y.
meta({
  name: 'passport-wallet',
  license: 'CC0-1.0',
  title: 'Passport wallet',
  description: 'Leather passport wallet: folded cover with rounded spine and stitched edges; open, a passport in its sleeve, a boarding pass, stepped card slots and a pen loop; closed, an embossed cover with snap tab. Compact or standard. Material controls: cover leather, lining, passport cover, cards, stitching; cognac, blackOxford and forestTravel presets.',
  tags: ['passport wallet', 'passport holder', 'travel wallet', 'travel organizer', 'leather', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'airport'],
  triangleBudget: 2500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard'], label: 'Folio size' });
const layout = param('layout', 'open', { choices: ['closed', 'open'], label: 'Folio layout' });
const cover = param('cover', '#7a4428', { label: 'Cover (leather)' });
const lining = param('lining', '#c9a677', { label: 'Lining and pockets (leather)' });
const passport = param('passport', '#6e1f2a', { label: 'Passport cover' });
const cards = param('cards', '#3d7fb0', { label: 'Cards and boarding pass' });
const stitching = param('stitching', '#e9d9b6', { label: 'Stitching and crest (thread, foil)' });
presets({
  cognac: { cover: '#8a4a26', lining: '#d1ad7c', passport: '#6e1f2a', cards: '#3d7fb0', stitching: '#efdcb4' },
  blackOxford: { cover: '#1e1d1f', lining: '#4b4446', passport: '#1b2c4f', cards: '#c7a23f', stitching: '#8f8a86' },
  forestTravel: { cover: '#2f4a3a', lining: '#b99a6c', passport: '#6e1f2a', cards: '#e0e0d8', stitching: '#d8c48a' },
});

const p = assembly('passport-wallet');
const k = size.value === 'compact' ? 0.9 : 1;
const add = (name, shape) => p.part(name, shape.scale(k));
const PW = 105;  // panel width (X)
const PL = 140;  // panel length (Y)
const CT = 2.5;  // cover thickness
const R = 8;

const panel = (w, l, r, t) => extrudeRoundedRect(w, l, r, t);
// Dashed stitch line just inside a rounded-rect panel edge.
const stitchLine = (cx, w, l, z, tag) => {
  for (const sy of [-1, 1]) for (let i = 0; i < 9; i += 1) {
    add(`${tag}-stitch-x-${sy}-${i}`, box(7, 1, 0.5, true).translate(cx - w / 2 + 12 + (i * (w - 24)) / 8, sy * (l / 2 - 4), z).color(stitching));
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 12; i += 1) {
    add(`${tag}-stitch-y-${sx}-${i}`, box(1, 7, 0.5, true).translate(cx + sx * (w / 2 - 4), -l / 2 + 12 + (i * (l - 24)) / 11, z).color(stitching));
  }
};

if (layout.value === 'open') {
  // Two cover panels side by side with a rounded spine between them.
  for (const sx of [-1, 1]) {
    const cx = sx * (PW / 2 + 4);
    add(`cover-${sx < 0 ? 'left' : 'right'}`, panel(PW, PL, R, CT).translate(cx, 0, 0).color(cover));
    add(`lining-${sx < 0 ? 'left' : 'right'}`, panel(PW - 4, PL - 4, R - 2, 1).translate(cx, 0, CT).color(lining));
  }
  add('spine', cylinder(PL - 2, 6, 10).rotateX(90).scale([1, 1, 0.45]).translate(0, PL / 2 - 1, 2.7).color(cover));
  // Left: boarding pass in the tall pocket, passport in its sleeve.
  const LX = -(PW / 2 + 4);
  add('boarding-pass', box(PW - 30, PL - 18, 0.6, true).rotateZ(-6).translate(LX + 6, 14, CT + 1.3).color(cards));
  add('boarding-pass-stub', box(PW - 34, 22, 0.8, true).rotateZ(-6).translate(LX + 4, PL / 2 - 26, CT + 1.6).color(stitching));
  add('passport', panel(88, 125, 4, 6).translate(LX, -4, CT + 1.6).color(passport));
  add('passport-crest', cylinder(0.6, 14, 16).translate(LX, 10, CT + 7.6).color(stitching));
  add('passport-title', box(46, 4, 0.6, true).translate(LX, 38, CT + 7.9).color(stitching));
  add('passport-band', box(46, 3, 0.6, true).translate(LX, -22, CT + 7.9).color(stitching));
  add('sleeve', panel(PW - 6, 58, 6, 2).translate(LX, -PL / 2 + 31, CT + 7.6).color(lining));
  // Right: three stepped card slots with cards peeking out, and a pen loop.
  const RX = PW / 2 + 4;
  for (let i = 0; i < 3; i += 1) {
    const y = PL / 2 - 30 - i * 22;
    add(`card-${i}`, panel(84, 52, 3, 0.8).translate(RX, y + 8, CT + 1 + i * 1.6).color(i === 1 ? stitching : cards));
    add(`card-slot-${i}`, panel(PW - 8, 46, 4, 1.2).translate(RX, y - 6, CT + 1.8 + i * 1.6).color(lining));
  }
  add('id-window', panel(80, 34, 3, 1).translate(RX, -PL / 2 + 26, CT + 1).color(cover));
  add('pen-loop', torus(6, 2, 8).rotateX(90).translate(RX + PW / 2 + 3, -10, 8).color(cover));
  stitchLine(-(PW / 2 + 4), PW, PL, CT + 0.25, 'left');
  stitchLine(PW / 2 + 4, PW, PL, CT + 0.25, 'right');
} else {
  // Closed: the two covers stacked over the passport, spine rounded on -X.
  add('cover-back', panel(PW, PL, R, CT).color(cover));
  add('inside', panel(PW - 4, PL - 4, R - 2, 10).translate(1, 0, CT).color(lining));
  add('cover-front', panel(PW, PL, R, CT).translate(0, 0, CT + 10).color(cover));
  add('spine', cylinder(PL - 2, (2 * CT + 10) / 2, 10).rotateX(90).translate(-PW / 2, PL / 2 - 1, (2 * CT + 10) / 2).color(cover));
  // Embossed crest and title foil on the front.
  add('crest', cylinder(0.8, 16, 16).translate(0, 18, 2 * CT + 10).color(stitching));
  add('title-foil', box(56, 4, 0.8, true).translate(0, 52, 2 * CT + 10.4).color(stitching));
  // Snap tab wrapped round the fore edge.
  add('snap-tab', extrudeRoundedRect(30, 34, 10, 2).translate(PW / 2 - 8, -20, 2 * CT + 10).color(cover));
  add('snap-tab-edge', box(3, 34, 2 * CT + 12, true).translate(PW / 2 + 3, -20, (2 * CT + 10) / 2 + 1).color(cover));
  add('snap', cylinder(2, 5, 12).translate(PW / 2 - 12, -20, 2 * CT + 12).color(stitching));
  stitchLine(0, PW, PL, 2 * CT + 10.25, 'front');
}

return p.model();
