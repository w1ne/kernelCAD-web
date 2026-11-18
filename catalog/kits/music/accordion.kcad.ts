// SPDX-License-Identifier: CC0-1.0
// Piano accordion.
// What makes it an accordion rather than a box: a pleated bellows whose
// folds zig-zag in and out, with nickel corner guards on every ridge, between
// two lacquered cases. The treble case carries a fretted grille and a full
// piano keyboard of ivory and ebony keys down its end; the bass case carries
// a staggered grid of Stradella bass buttons and a leather hand strap, and a
// pair of leather shoulder-strap tabs and register switches finish it.
// Generic visualization geometry at real size (about 0.48 m across, 0.45 m
// tall), millimetres, Z up, bellows along X, grille facing -Y, resting on z = 0.
meta({
  name: 'accordion',
  license: 'CC0-1.0',
  title: 'Accordion',
  description: 'Piano accordion at real size: zig-zag pleated bellows with nickel corner guards between two lacquered cases, a fretted treble grille, a full ivory and ebony piano keyboard, register switches, a staggered grid of bass buttons and leather hand and shoulder straps. Material controls: case lacquer, bellows fabric, ivory and ebony keys, nickel hardware, leather straps. Concert, vintage and pearl presets.',
  tags: ['accordion', 'piano accordion', 'bellows', 'keyboard', 'squeezebox', 'music', 'instrument', 'folk', 'low poly', 'CC0'],
  kit: 'music',
  category: 'prop',
  origin: 'base',
  compat: ['music', 'orchestra', 'stage', 'indoor'],
  triangleBudget: 3600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const lacquer = param('lacquer', '#b83b47', { label: 'Case lacquer' });
const bellows = param('bellows', '#302b34', { label: 'Bellows fabric' });
const ivory = param('ivory', '#eee2c6', { label: 'Ivory keys and buttons' });
const ebony = param('ebony', '#1c1a1d', { label: 'Ebony keys' });
const nickel = param('nickel', '#b6c0c4', { label: 'Nickel grille and guards' });
const leather = param('leather', '#6b3f26', { label: 'Leather straps' });

presets({
  concert: { lacquer: '#1f1d22', bellows: '#7d1d28', leather: '#2a2120' },
  vintage: { lacquer: '#71323d', bellows: '#2a2622', ivory: '#e4d3ae', nickel: '#a99d84', leather: '#7a4a2a' },
  pearl: { lacquer: '#e9e4dc', bellows: '#24427a', nickel: '#d4dadc', leather: '#3a2a22' },
});

const p = assembly('accordion');
const add = (name, shape) => p.part(name, shape.scale(scale));

const rect = (w, d, c) => path()
  .moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2).lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c)
  .lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2).lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).close();
const roundRect = (w, h, r, n = 2) => {
  const pts = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i += 1) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};
const button = (r, h) => extrudePolygon(Array.from({ length: 6 }, (_, i) => [r * Math.cos((Math.PI * i) / 3), r * Math.sin((Math.PI * i) / 3)]), h);

const H = 450;
const D = 200;
const ZC = H / 2;

// Cases: rounded slabs standing on edge, extruded along X.
const caseSlab = (x0, w) => extrudePolygon(roundRect(H, D, 28), w).rotateY(90).translate(x0, 0, ZC);
const TX0 = -270;
const TX1 = -160;
const BX0 = 120;
const BX1 = 215;
add('treble-case', caseSlab(TX0, TX1 - TX0).color(lacquer));
add('bass-case', caseSlab(BX0, BX1 - BX0).color(lacquer));
for (const x of [TX1 - 4, BX0 - 6]) add(`bellows-frame-${x}`, caseSlab(x, 10).color(nickel));

// Bellows: one ruled loft zig-zagging between valley and ridge sections.
const folds = 9;
const span = BX0 - TX1;
const sections = [];
const planes = [];
for (let i = 0; i <= 2 * folds; i += 1) {
  const ridge = i % 2 === 1;
  sections.push(ridge ? rect(H - 6, D + 14, 22) : rect(H - 46, D - 26, 18));
  planes.push({ plane: 'XY' as const, origin: [0, 0, (span * i) / (2 * folds)] as [number, number, number] });
}
const pleats = sections[0].loft(sections.slice(1), { planes, ruled: true });
add('bellows', pleats.rotateY(90).translate(TX1, 0, ZC).color(bellows));
// Nickel corner guards on each ridge.
for (let i = 0; i < folds; i += 1) {
  const x = TX1 + (span * (2 * i + 1)) / (2 * folds);
  for (const [sy, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    add(`guard-${i}-${sy}-${sz}`, box(9, 22, 22, true).translate(x, sy * (D / 2 + 1), ZC + sz * (H / 2 - 11)).color(nickel));
  }
}

// Treble grille: nickel panel with fret slots on the -Y face.
const GY = -D / 2;
add('grille', extrudePolygon(roundRect(96, 300, 14), 6).rotateX(90).translate(-215, GY, 210).color(nickel));
for (let i = 0; i < 7; i += 1) {
  add(`fret-${i}`, box(70, 4, 10, true).translate(-215, GY - 6, 90 + i * 40).color(lacquer));
}
add('grille-badge', extrudePolygon(roundRect(60, 26, 8), 5).rotateX(90).translate(-215, GY - 5, 385).color(ivory));

// Piano keyboard down the -X end: ivory naturals, raised ebony sharps.
const KX = TX0;
add('keyboard-bed', box(14, 150, 400, true).translate(KX - 7, -20, ZC).color(lacquer));
const naturals = 24;
const pitch = 380 / naturals;
for (let i = 0; i < naturals; i += 1) {
  const z = ZC - 190 + pitch * (i + 0.5);
  add(`key-${String(i + 1).padStart(2, '0')}`, box(18, 130, pitch - 1.6, true).translate(KX - 23, -25, z).color(ivory));
  const note = i % 7; // C D E F G A B
  if (note !== 2 && note !== 6 && i < naturals - 1) {
    add(`sharp-${String(i + 1).padStart(2, '0')}`, box(14, 78, pitch * 0.55, true).translate(KX - 38, -1, z + pitch / 2).color(ebony));
  }
}
// Register switches along the top of the treble case.
for (let i = 0; i < 6; i += 1) {
  add(`register-${i}`, box(12, 22, 10, true).translate(TX0 + 14 + i * 16, -40, H + 4).color(ivory));
}

// Stradella bass buttons: staggered rows on the bass case's -Y face.
for (let r = 0; r < 6; r += 1) {
  for (let c = 0; c < 8; c += 1) {
    const x = BX0 + 18 + r * 11 + (c % 2) * 4;
    const z = 70 + c * 40 + r * 7;
    add(`bass-button-${r}-${c}`, button(7, 12).rotateX(90).translate(x, GY + 2, z).color(r === 2 && c === 3 ? nickel : ivory));
  }
}
// Leather bass hand strap across the +X end, with nickel buckle.
add('hand-strap', box(14, 70, 300, true).translate(BX1 + 9, 10, ZC).color(leather));
add('strap-buckle', box(18, 40, 24, true).translate(BX1 + 14, 10, ZC + 110).color(nickel));
// Shoulder-strap tabs on the back of the treble case.
for (const z of [90, 380]) {
  add(`shoulder-tab-${z}`, box(40, 24, 50, true).translate(-200, D / 2 + 12, z).color(leather));
}
// Feet so it rests on the bottom edge.
for (const x of [-245, -185, 145, 195]) {
  add(`foot-${x}`, box(24, 120, 8, true).translate(x, 0, 4).color(ebony));
}

return p.model();
