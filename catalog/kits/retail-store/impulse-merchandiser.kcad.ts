// SPDX-License-Identifier: CC0-1.0
// Impulse merchandiser: the narrow sweets-and-gum rack that stands beside
// a checkout lane. What makes it an impulse rack rather than a shelf: five
// raked wire trays that tip the stock toward the shopper, each with a low
// front fence and a price strip, rows of chocolate bars and gum packs
// facing out, a peg strip on the side with hanging blister packs, a kick
// plinth on levelling feet and a printed header card on top. Generic
// visualization geometry at about real size (0.45 m wide, 1.6 m tall),
// millimetres, Z up, front on -Y.

meta({
  name: "impulse-merchandiser",
  license: 'CC0-1.0',
  title: "Impulse merchandiser",
  description: "Checkout-lane impulse rack at about real size: five raked wire trays with front fences and price strips, rows of chocolate bars and gum packs, a side peg strip with hanging blister packs, kick plinth on levelling feet and a printed header card. Material controls: powder-coated frame, header print, wrapper colours A and B. checkoutRed, minimalWhite and nightShift presets.",
  tags: ['impulse rack', 'checkout display', 'confectionery stand', 'candy rack', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2e3236', { label: 'Powder-coated frame' });
const print = param('print', '#d8282f', { label: 'Header print' });
const wrapA = param('wrapA', '#5a2d1c', { label: 'Wrapper A (chocolate)' });
const wrapB = param('wrapB', '#2fa65a', { label: 'Wrapper B (gum)' });

presets({
  checkoutRed: { frame: '#2e3236', print: '#d8282f', wrapA: '#5a2d1c', wrapB: '#2fa65a' },
  minimalWhite: { frame: '#e6eaec', print: '#1f6fb5', wrapA: '#7b3fa0', wrapB: '#f2b632' },
  nightShift: { frame: '#1d2a33', print: '#f2b632', wrapA: '#c0392b', wrapB: '#3aa0d8' },
});

const p = assembly("impulse-merchandiser");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 450;
const D = 360;
const TOP = 1500;
const RAKE = 14;

// Kick plinth on four levelling feet, back panel and side uprights.
for (const [k, x, y] of [['lf', -1, -1], ['rf', 1, -1], ['lb', -1, 1], ['rb', 1, 1]]) {
  add(`foot-${k}`, cylinder(20, 22, 10).translate(x * (W / 2 - 40), y * (D / 2 - 40), 0).color('#1a1c1e'));
}
add("plinth", blk(0, 0, 20, W, D, 90).color(frame));
add("plinth-strip", blk(0, -D / 2 - 2, 50, W - 40, 4, 30).color(print));
add("back", blk(0, D / 2 - 10, 110, W, 20, TOP - 110).color(frame));
const side = [[-D / 2, 110], [D / 2, 110], [D / 2, TOP], [D / 2 - 120, TOP], [-D / 2 + 40, 1240], [-D / 2 + 40, 110]];
for (const [k, x] of [['l', -W / 2 + 8], ['r', W / 2 - 8]]) add(`upright-${k}`, profileYZ(side, 16).translate(x, 0, 0).color(frame));

// Raked trays: each is built flat at its origin, then tipped forward about its back edge.
const tip = (s: Shape, z: number) => s.translate(0, -(D / 2 - 30), 0).rotateX(RAKE).translate(0, D / 2 - 30, z);
const trays = [200, 420, 640, 860, 1080];
trays.forEach((z, t) => {
  const yf = -D / 2 + 50;
  const L = D - 80;
  add(`tray-${t}`, tip(blk(0, yf + L / 2, 0, W - 32, L, 6), z).color('#9aa3a7'));
  for (let w = 0; w < 6; w++) add(`tray-wire-${t}-${w}`, tip(blk(-160 + w * 64, yf + L / 2, 6, 4, L, 4), z).color('#c9cfd2'));
  add(`fence-${t}`, tip(blk(0, yf - 2, 0, W - 32, 6, 50), z).color('#c9cfd2'));
  add(`price-strip-${t}`, tip(blk(0, yf - 8, 6, W - 60, 4, 30), z).color('#f4f2ea'));
  add(`price-tag-${t}`, tip(blk(-110, yf - 11, 10, 70, 3, 22), z).color('#f2d24a'));
  // Stock: chocolate bars standing on edge on the even trays, gum packs on the odd ones.
  for (let i = 0; i < 4; i++) {
    const x = -150 + i * 100;
    if (t % 2 === 0) {
      for (let j = 0; j < 2; j++) {
        add(`bar-${t}-${i}-${j}`, tip(blk(x, yf + 20 + j * 30, 6, 84, 22, 150), z).color(wrapA));
        if (j === 0) add(`bar-band-${t}-${i}`, tip(blk(x, yf + 8, 70, 86, 3, 34), z).color(print));
      }
    } else {
      add(`gum-${t}-${i}`, tip(blk(x, yf + 50, 6, 80, 80, 110), z).color(wrapB));
      add(`gum-label-${t}-${i}`, tip(blk(x, yf + 9, 50, 60, 3, 40), z).color('#f4f2ea'));
    }
  }
});

// Peg strip on the camera-side upright with hanging blister packs.
add("peg-strip", blk(-W / 2 - 4, 0, 1280, 10, D - 120, 40).color(frame));
for (let i = 0; i < 2; i++) {
  const y = -60 + i * 120;
  add(`peg-${i}`, cylinder(120, 4, 6).rotateY(-90).translate(-W / 2 - 8, y, 1290).color('#c9cfd2'));
  for (let j = 0; j < 3; j++) {
    add(`blister-${i}-${j}`, blk(-W / 2 - 30 - j * 30, y, 1120, 8, 100, 150).color(j % 2 ? wrapB : wrapA));
    add(`blister-card-${i}-${j}`, blk(-W / 2 - 30 - j * 30, y, 1250, 8, 100, 40).color('#f4f2ea'));
  }
}

// Header card: arched top with a starburst roundel.
const arch = [[-W / 2, 0], [W / 2, 0]];
for (let i = 0; i <= 10; i++) {
  const a = (i / 10) * Math.PI;
  arch.push([(W / 2) * Math.cos(a), 180 + 60 * Math.sin(a)]);
}
add("header", profileXZ(arch, 12).translate(0, D / 2 - 30, TOP).color(print));
const star = [];
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * 2 * Math.PI;
  const r = i % 2 ? 48 : 70;
  star.push([r * Math.cos(a), r * Math.sin(a)]);
}
add("header-star", profileXZ(star, 6).translate(-120, D / 2 - 40, TOP + 130).color('#f2d24a'));
add("header-word", blk(70, D / 2 - 40, TOP + 140, 190, 6, 56).color('#f4f2ea'));
add("header-sub", blk(70, D / 2 - 40, TOP + 70, 150, 6, 26).color('#f2d24a'));

return p.model();
