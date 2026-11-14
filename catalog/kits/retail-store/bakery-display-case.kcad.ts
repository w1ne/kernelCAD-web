// SPDX-License-Identifier: CC0-1.0
// Bakery display case: the serve-over counter a baker sells cakes and
// bread from. What makes it a bakery case rather than a cabinet: a
// timber-faced counter with a brand band and recessed kick, a curved
// front glass hinged at its top edge (lifted up here for loading, so the
// goods show), shaped glass end panels, a stainless deck with slate trays
// of iced cakes, cupcakes and croissants, two stepped tiers of loaves
// behind, and a baguette basket on the lit top shelf. Generic
// visualization geometry at about real size (1.6 m long, 1.34 m tall),
// millimetres, Z up, customer side on -Y.

meta({
  name: "bakery-display-case",
  license: 'CC0-1.0',
  title: "Bakery display case",
  description: "Serve-over bakery counter at about real size: timber-faced cabinet with brand band and kick, curved front glass hinged at the top (lifted or closed), shaped glass ends, stainless deck with trays of iced cakes, cupcakes and croissants, two stepped tiers of loaves and a baguette basket on the lit top shelf. Material controls: cabinet facing, stainless trim, glass, brand band. frenchOak, modernWhite and patisseriePink presets; front glass choice.",
  tags: ['bakery case', 'display case', 'pastry counter', 'serve-over', 'bakery', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const facing = param('facing', '#9a6b42', { label: 'Cabinet facing' });
const stainless = param('stainless', '#c3cacd', { label: 'Stainless trim and deck' });
const glass = param('glass', '#b9dde3', { label: 'Front and end glass' });
const band = param('band', '#3b2a1e', { label: 'Brand band' });
const front = param('front', 'lifted', { choices: ['lifted', 'closed'], label: 'Front glass' });

presets({
  frenchOak: { facing: '#9a6b42', stainless: '#c3cacd', glass: '#b9dde3', band: '#3b2a1e' },
  modernWhite: { facing: '#eef0ee', stainless: '#a7b0b4', glass: '#c4e0e8', band: '#2b2f33' },
  patisseriePink: { facing: '#e6b8c2', stainless: '#d8c9a0', glass: '#cfe6ea', band: '#7a3550' },
});

const p = assembly("bakery-display-case");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const L = 1600;
const DECK = 860;
const YF = -420;
const YB = 380;
const HY = -60;
const HZ = 1320;

// Counter body: kick, timber facing, brand band, stainless deck.
add("kick", blk(0, 20, 0, L - 40, 760, 100).color('#2b2f33'));
add("cabinet", blk(0, 0, 100, L, 800, DECK - 140).color(facing));
for (let i = 0; i < 7; i++) add(`facing-groove-${i}`, blk(-600 + i * 200, -402, 160, 8, 6, 460).color(band));
add("brand-band", blk(0, -404, 640, L, 10, 70).color(band));
add("band-plaque", blk(0, -412, 615, 360, 10, 120).color(stainless));
add("deck-rail", blk(0, -400, DECK - 40, L + 20, 30, 40).color(stainless));
add("deck", blk(0, 0, DECK - 40, L, 800, 40).color(stainless));

// Shaped glass ends and the curved front glass, hinged at its top edge.
const arc = (r0: number) => {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    pts.push([HY - (HY - YF - r0) * Math.cos(a), DECK + (HZ - DECK - r0 * 0.6) * Math.sin(a)]);
  }
  return pts;
};
const endProfile = [...arc(0), [YB, HZ], [YB, DECK]];
for (const [k, x] of [['l', -L / 2 + 8], ['r', L / 2 - 8]]) add(`end-glass-${k}`, profileYZ(endProfile, 12).translate(x, 0, 0).color(glass));
const shell = [...arc(0), ...arc(14).reverse()];
const lift = front.value === 'lifted' ? -72 : 0;
const hinge = (s: Shape) => s.translate(0, -HY, -HZ).rotateX(lift).translate(0, HY, HZ);
add("front-glass", hinge(profileYZ(shell, L - 30)).color(glass));
add("glass-edge", hinge(blk(0, YF + 6, DECK - 6, L - 30, 20, 16)).color(stainless));
if (lift !== 0) {
  for (const [k, x] of [['l', -L / 2 + 40], ['r', L / 2 - 40]]) add(`gas-strut-${k}`, cylinder(300, 9, 8).rotateX(-62).translate(x, HY - 30, HZ - 260).color('#3a3f43'));
}

// Lit top shelf on rear posts.
add("top-shelf", blk(0, (HY + YB) / 2, HZ, L, YB - HY, 24).color(stainless));
add("light-strip", blk(0, HY + 30, HZ - 12, L - 60, 30, 12).color('#fff4c8'));
for (const [k, x] of [['l', -L / 2 + 30], ['r', L / 2 - 30]]) add(`post-${k}`, blk(x, YB - 20, DECK, 30, 30, HZ - DECK).color(stainless));

// Deck trays: iced cakes, cupcakes, croissants.
const slate = '#34383b';
for (const [k, x] of [['a', -540], ['b', 0], ['c', 540]]) add(`tray-${k}`, blk(x, -230, DECK, 480, 300, 12).color(slate));
const icings = ['#f2e6d0', '#5a3524', '#e98aa0'];
icings.forEach((ice, i) => {
  const x = -640 + i * 110;
  add(`cake-${i}`, cylinder(70, 48, 14).translate(x, -230 + (i % 2) * 70 - 30, DECK + 12).color('#d9a35b'));
  add(`icing-${i}`, cylinder(14, 50, 14).translate(x, -230 + (i % 2) * 70 - 30, DECK + 82).color(ice));
});
add("berry", sphere(12).translate(-640, -260, DECK + 104).color('#c8232c'));
for (let i = 0; i < 6; i++) {
  const x = -90 + (i % 3) * 90;
  const y = -290 + Math.floor(i / 3) * 110;
  add(`cupcake-${i}`, turned([[0, 0], [28, 0], [34, 40], [0, 40]]).translate(x, y, DECK + 12).color('#e8d2a8'));
  add(`frosting-${i}`, turned([[0, 0], [38, 0], [26, 22], [10, 40], [0, 44]]).translate(x, y, DECK + 52).color(icings[(i + 1) % 3] === '#5a3524' ? '#f5c2d0' : icings[(i + 1) % 3]));
}
const crescent = [];
for (let i = 0; i <= 8; i++) {
  const a = Math.PI * (0.1 + 0.8 * (i / 8));
  crescent.push([66 * Math.cos(a), 46 * Math.sin(a)]);
}
for (let i = 8; i >= 0; i--) {
  const a = Math.PI * (0.1 + 0.8 * (i / 8));
  crescent.push([50 * Math.cos(a), 40 * Math.sin(a) - 22]);
}
for (let i = 0; i < 6; i++) {
  const x = 400 + (i % 3) * 140;
  const y = -320 + Math.floor(i / 3) * 130;
  add(`croissant-${i}`, extrudePolygon(crescent, 30).rotateZ(180).translate(x, y, DECK + 12).color('#c98a3c'));
}
for (const [k, x] of [['a', -540], ['b', 0], ['c', 540]]) add(`price-tag-${k}`, blk(0, 0, 0, 90, 4, 50).rotateX(-30).translate(x, -385, DECK + 12).color('#f4f1ea'));

// Two stepped tiers of loaves behind the trays.
const loaf = turned([[0, 0], [60, 0], [62, 25], [48, 55], [0, 68]]).scale([1.7, 1, 1]);
const crusts = ['#b07a3c', '#8a5a2c', '#c9944c'];
[[DECK + 150, 0], [DECK + 300, 150]].forEach(([z, y], ti) => {
  add(`tier-${ti}`, blk(0, y, z - 14, L - 60, 150, 14).color(stainless));
  add(`tier-lip-${ti}`, blk(0, y - 78, z - 14, L - 60, 6, 40).color(stainless));
  for (const [k, x] of [['l', -L / 2 + 60], ['r', L / 2 - 60]]) add(`tier-leg-${ti}-${k}`, blk(x, y, DECK, 20, 20, z - DECK - 14).color(stainless));
  for (let i = 0; i < 6; i++) add(`loaf-${ti}-${i}`, loaf.translate(-600 + i * 240, y, z).color(crusts[(i + ti) % 3]));
});

// Baguette basket on the top shelf.
add("basket", blk(380, 160, HZ + 24, 520, 200, 110).subtract(blk(380, 160, HZ + 40, 490, 170, 120)).color('#a8743e'));
for (let i = 0; i < 5; i++) {
  add(`baguette-${i}`, cylinder(620, 26, 10).rotateY(90).rotateZ(8 - i * 4).translate(80, 110 + i * 25, HZ + 100 + (i % 2) * 22).color('#d0974a'));
}
add("bread-sign", blk(-450, 120, HZ + 24, 380, 14, 160).color(band));
add("bread-sign-text", blk(-450, 112, HZ + 80, 280, 4, 50).color('#f4f1ea'));

return p.model();
