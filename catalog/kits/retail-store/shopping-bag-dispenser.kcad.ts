// SPDX-License-Identifier: CC0-1.0
// Shopping bag dispenser: the pedestal unit at the end of a checkout that
// hands out carrier bags one at a time. What makes it a bag dispenser
// rather than a sign post: a weighted round base and steel post carrying a
// housing with a window onto the folded bag stack, a sloped hood with the
// price card on top, a pull slot at the bottom with the next T-shirt bag
// hanging out by its handles, and a side arm holding a roll of tear-off
// produce bags. Generic visualization geometry at about real size (0.46 m
// wide head, 1.58 m tall), millimetres, Z up, front on -Y.

meta({
  name: "shopping-bag-dispenser",
  license: 'CC0-1.0',
  title: "Shopping bag dispenser",
  description: "Checkout pedestal carrier-bag dispenser at about real size: weighted round base and steel post, housing with a window onto the folded bag stack, sloped hood with a price card, pull slot with the next T-shirt bag hanging out, and a side arm with a roll of tear-off produce bags. Material controls: housing, bags, post steel, price card accent. ecoGreen, storeBlue and nightRestock presets.",
  tags: ['bag dispenser', 'carrier bags', 'checkout', 'produce bags', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#2f8a4a', { label: 'Housing' });
const bags = param('bags', '#f4f1ea', { label: 'Bags' });
const post = param('post', '#b7c0c3', { label: 'Post steel' });
const accent = param('accent', '#f2b632', { label: 'Price card accent' });

presets({
  ecoGreen: { housing: '#2f8a4a', bags: '#f4f1ea', post: '#b7c0c3', accent: '#f2b632' },
  storeBlue: { housing: '#2f6f9e', bags: '#e8eef2', post: '#c4cbcf', accent: '#d8322a' },
  nightRestock: { housing: '#354750', bags: '#c9b27e', post: '#66747a', accent: '#d2a536' },
});

const p = assembly("shopping-bag-dispenser");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Weighted round base and post.
add("base", turned([[0, 0], [220, 0], [220, 14], [150, 50], [40, 60], [0, 60]]).color(post));
add("base-ring", cylinder(8, 224, 24).color('#2b2f33'));
add("post", cylinder(900, 30, 12).translate(0, 0, 60).color(post));

// Housing with a window onto the folded bag stack.
const HZ = 940;
const HH = 440;
const window = blk(0, -130, HZ + 60, 360, 50, 300);
add("housing", blk(0, -40, HZ, 460, 180, HH).subtract(window).color(housing));
add("bag-stack", blk(0, -96, HZ + 60, 360, 20, 300).color(bags));
for (let i = 0; i < 9; i++) add(`bag-fold-${i}`, blk(0, -107, HZ + 80 + i * 30, 340, 4, 4).color('#c9c4b4'));
add("bag-logo", blk(0, -109, HZ + 160, 120, 4, 90).color(housing));
add("window-rim", blk(0, -133, HZ + 50, 380, 6, 10).color(post));

// Sloped hood with the price card on top.
add("hood", profileYZ([[60, HZ + HH], [-150, HZ + HH], [-150, HZ + HH + 20], [60, HZ + HH + 70]], 480).color(housing));
add("card-holder", blk(0, 0, HZ + HH + 40, 200, 20, 30).color(post));
const card = (s: Shape) => s.rotateX(-10).translate(0, 0, HZ + HH + 60);
add("price-card", card(blk(0, 0, 0, 300, 6, 140)).color(accent));
add("price-text", card(blk(0, -4, 50, 180, 4, 50)).color('#2b2f33'));

// Pull slot with the next T-shirt bag hanging out by its handles.
add("pull-slot", blk(0, -131, HZ + 10, 320, 6, 20).color('#15181a'));
const bag = [[-150, 700], [150, 700], [150, 915], [122, 945], [82, 945], [82, 892], [-82, 892], [-82, 945], [-122, 945], [-150, 915]];
add("hanging-bag", profileXZ(bag, 6).translate(0, -136, 0).color(bags));
add("hanging-bag-print", profileXZ([[-60, 760], [60, 760], [60, 840], [-60, 840]], 4).translate(0, -141, 0).color(housing));

// Side arm with a roll of tear-off produce bags.
add("roll-arm", blk(300, -40, HZ + 230, 160, 30, 20).color(post));
add("roll-hanger", blk(380, -40, HZ + 140, 12, 30, 110).color(post));
add("produce-roll", cylinder(200, 55, 14).rotateY(90).translate(280, -40, HZ + 120).color('#dcefe0'));
add("roll-core", cylinder(206, 18, 10).rotateY(90).translate(277, -40, HZ + 120).color('#9a7a52'));
add("tear-sheet", blk(380, -96, HZ - 80, 180, 3, 200).color('#dcefe0'));

return p.model();
