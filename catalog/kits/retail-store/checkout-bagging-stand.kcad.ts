// SPDX-License-Identifier: CC0-1.0
// Checkout bagging stand: the bagging area at the end of a self-checkout
// or packing lane. What makes it a bagging stand rather than a table: a
// security weigh plate with a rubber mat on a laminate top, a bag rack on
// two tubular posts with forward prongs, carrier bags hung open by their
// handles over the prongs and standing on the plate with shopping
// inside, a pad of unopened bags on a spare pair of prongs, a lane sign
// on the rail and a lower shelf of spare bag packs. Generic
// visualization geometry at about real size (0.9 m wide, 1.42 m tall),
// millimetres, Z up, customer side on -Y.

meta({
  name: "checkout-bagging-stand",
  license: 'CC0-1.0',
  title: "Bagging stand",
  description: "Checkout bagging stand at about real size: tubular stainless legs and bag rack, laminate top with a security weigh plate and rubber mat, carrier bags hung open over forward prongs with shopping inside, a pad of fresh bags, lane sign and a lower shelf of spare bag packs. Material controls: stainless frame, laminate top, carrier bags, signage. supermarket, discounter and organicGrocer presets; bag count choice.",
  tags: ['bagging stand', 'bagging area', 'self checkout', 'carrier bag', 'checkout', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#b7c0c4', { label: 'Stainless frame and rack' });
const laminate = param('laminate', '#c9a77a', { label: 'Laminate top' });
const bagPoly = param('bagPoly', '#eef1ec', { label: 'Carrier bags' });
const signage = param('signage', '#2f8f4e', { label: 'Lane signage and bag print' });
const bags = param('bags', 'two', { choices: ['two', 'one'], label: 'Bags hung open' });

presets({
  supermarket: { stainless: '#b7c0c4', laminate: '#c9a77a', bagPoly: '#eef1ec', signage: '#2f8f4e' },
  discounter: { stainless: '#8f9a9e', laminate: '#5c6468', bagPoly: '#f2d24a', signage: '#1d4fa0' },
  organicGrocer: { stainless: '#2f3437', laminate: '#a7774a', bagPoly: '#d8c4a0', signage: '#6b8f3a' },
});

const p = assembly("checkout-bagging-stand");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 900;
const D = 500;
const TOP = 800;
const RAIL = 1250;
const PRONG = 1245;

// Tubular legs on glides, apron rails and the lower shelf.
for (const [k, x, y] of [['lf', -410, -210], ['rf', 410, -210], ['lb', -410, 210], ['rb', 410, 210]]) {
  add(`glide-${k}`, cylinder(12, 26, 10).translate(x, y, 0).color('#2b2f33'));
  add(`leg-${k}`, cylinder(TOP - 52, 20, 10).translate(x, y, 12).color(stainless));
}
for (const [k, y] of [['f', -210], ['b', 210]]) add(`apron-${k}`, blk(0, y, TOP - 80, W - 60, 24, 40).color(stainless));
add("lower-shelf", blk(0, 0, 180, W - 40, D - 60, 16).color(stainless));
for (let i = 0; i < 3; i++) add(`bag-pack-${i}`, blk(-240 + i * 170, -40 + (i % 2) * 40, 196, 150, 220, 90 - i * 15).color(i === 1 ? signage : bagPoly));

// Laminate top, front bumper, weigh plate and rubber mat.
add("top", blk(0, 0, TOP - 40, W, D, 40).color(laminate));
add("bumper", blk(0, -D / 2 - 4, TOP - 44, W + 8, 8, 48).color(stainless));
add("weigh-plate", blk(0, -20, TOP, 820, 400, 10).color(stainless));
add("mat", blk(0, -20, TOP + 10, 800, 380, 4).color('#2b2f33'));
for (let i = 0; i < 9; i++) add(`mat-rib-${i}`, blk(-360 + i * 90, -20, TOP + 14, 12, 360, 3).color('#3d4246'));

// Bag rack: posts, top rail and forward prongs.
for (const [k, x] of [['l', -400], ['r', 400]]) add(`post-${k}`, cylinder(RAIL - TOP, 16, 10).translate(x, 200, TOP).color(stainless));
add("top-rail", cylinder(800, 16, 10).rotateY(90).translate(-400, 200, RAIL).color(stainless));
const prongs = [['al', -310], ['ar', -70], ['bl', 70], ['br', 310]];
for (const [k, x] of prongs) {
  add(`prong-${k}`, cylinder(360, 9, 8).rotateX(90).translate(x, 200, PRONG).color(stainless));
  add(`prong-tip-${k}`, cylinder(16, 14, 8).rotateX(90).translate(x, -160, PRONG).color('#2b2f33'));
}

// Lane sign on the rail.
add("sign", blk(0, 200, RAIL + 16, 520, 20, 140).color(signage));
add("sign-text", blk(40, 188, RAIL + 66, 300, 4, 40).color('#f4f1ea'));
add("sign-bag-icon", blk(-180, 188, RAIL + 46, 70, 4, 70).color('#f4f1ea'));
add("sign-bag-handle", blk(-180, 188, RAIL + 116, 30, 4, 20).subtract(blk(-180, 186, RAIL + 116, 14, 8, 12)).color('#f4f1ea'));

// A carrier bag hung open: body standing on the mat, handle arches over the prongs.
const ZB = TOP + 18;
const BH = 330;
const arch = (r0: number, r1: number) => {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (i / 10);
    pts.push([r1 * Math.cos(a), ZB + BH + r1 * Math.sin(a)]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = Math.PI * (i / 10);
    pts.push([r0 * Math.cos(a), ZB + BH - 4 + r0 * Math.sin(a)]);
  }
  return pts;
};
const handle = profileYZ(arch(88, 104), 10);
const hangBag = (k: string, bx: number) => {
  add(`bag-${k}`, blk(bx, 0, ZB, 300, 220, BH).subtract(blk(bx, 0, ZB + 8, 288, 208, BH)).color(bagPoly));
  add(`bag-print-${k}`, blk(bx, -112, ZB + 120, 130, 4, 110).color(signage));
  add(`bag-print-text-${k}`, blk(bx, -115, ZB + 80, 150, 4, 22).color(signage));
  for (const [s, dx] of [['l', -120], ['r', 120]]) add(`bag-handle-${k}-${s}`, handle.translate(bx + dx, 0, 0).color(bagPoly));
};

hangBag('a', -190);
add("bottle", cylinder(330, 38, 12).translate(-250, 40, ZB + 8).color('#3f8f5a'));
add("bottle-neck", cylinder(70, 16, 10).translate(-250, 40, ZB + 338).color('#3f8f5a'));
add("bottle-cap", cylinder(20, 18, 10).translate(-250, 40, ZB + 408).color('#c8232c'));
add("cereal-box", blk(-130, 30, ZB + 8, 130, 60, 400).color('#e3a72f'));
add("cereal-box-band", blk(-130, -2, ZB + 300, 132, 4, 70).color('#c8232c'));
add("baguette", cylinder(420, 28, 10).rotateY(-70).translate(-60, -40, ZB + 260).color('#d0974a'));

if (bags.value === 'two') {
  hangBag('b', 190);
  add("milk-jug", blk(130, 20, ZB + 8, 120, 110, 300).color('#f4f6f8'));
  add("milk-cap", cylinder(24, 22, 10).translate(150, 20, ZB + 308).color('#2f6fd0'));
  add("leek", cylinder(420, 20, 8).rotateY(18).translate(250, -20, ZB + 8).color('#e6ead2'));
  add("leek-leaves", cylinder(160, 28, 8).rotateY(18).translate(380, -20, ZB + 410).color('#4f8f3a'));
} else {
  // A pad of unopened bags waiting on the spare prongs.
  add("bag-pad", blk(190, -110, ZB + 140, 290, 40, BH + 90).color(bagPoly));
  add("bag-pad-print", blk(190, -132, ZB + 300, 120, 4, 100).color(signage));
}

return p.model();
