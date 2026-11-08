// SPDX-License-Identifier: CC0-1.0
// Checkout counter: the cashier station at the end of a supermarket lane.
// What makes it a checkout rather than a desk: a body with a curved
// customer-side fascia and a brand stripe, a worktop with a flush flatbed
// scanner window and a raised customer ledge, a card terminal on a swivel
// pole facing the shopper, a cashier POS screen on a post, a cash drawer
// under the till, a bagging well at the far end, and a lane-number light
// on a tall pole. Generic visualization geometry at about real size
// (1.8 m long, 900 mm worktop), millimetres, Z up, customer side on -Y.

meta({
  name: "checkout-counter",
  license: 'CC0-1.0',
  title: "Checkout counter",
  description: "Supermarket checkout counter at about real size: curved customer fascia with brand stripe and kick plate, worktop with flush flatbed scanner and raised customer ledge, card terminal on a swivel pole, cashier POS screen, cash drawer, bagging well and a lane-number light pole. Material controls: fascia, worktop, steel trim, brand accent. freshGreen, discountRed and boutiqueOak presets; bagging choice.",
  tags: ['checkout', 'till', 'cash desk', 'pos', 'supermarket', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fascia = param('fascia', '#e9ecea', { label: 'Fascia panels' });
const worktop = param('worktop', '#4a4f53', { label: 'Worktop laminate' });
const steel = param('steel', '#b9c1c5', { label: 'Steel trim and poles' });
const accent = param('accent', '#2f9e52', { label: 'Brand accent' });
const bagging = param('bagging', 'well', { choices: ['well', 'carousel'], label: 'Bagging end' });

presets({
  freshGreen: { fascia: '#e9ecea', worktop: '#4a4f53', steel: '#b9c1c5', accent: '#2f9e52' },
  discountRed: { fascia: '#f3e9d2', worktop: '#2c2e30', steel: '#9aa2a6', accent: '#d2362d' },
  boutiqueOak: { fascia: '#b78a5c', worktop: '#e8e4dc', steel: '#2e3134', accent: '#c9a54a' },
});

const p = assembly("checkout-counter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

// Plan outline of the body: straight cashier back, gently bowed customer front.
const L = 1800;
const bow = (inset: number) => {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = -L / 2 + inset + t * (L - 2 * inset);
    pts.push([x, -300 - 60 * Math.sin(Math.PI * t) + inset]);
  }
  return pts;
};
const plan = (inset: number) => [...bow(inset), [L / 2 - inset, 330 - inset], [-L / 2 + inset, 330 - inset]];

add("kick-plate", extrudePolygon(plan(30), 100).color(steel));
add("body", extrudePolygon(plan(0), 760).translate(0, 0, 100).subtract(blk(560, 0, 520, 520, 520, 400)).color(fascia));
add("brand-stripe", extrudePolygon(plan(-4), 70).translate(0, 0, 640).color(accent));
add("lane-logo", extrudePolygon(circle(70, 20), 8).rotateX(90).translate(-500, -356, 400).color(accent));

// Worktop with rounded customer edge, raised ledge and flush scanner.
add("worktop", extrudePolygon(plan(-20), 36).translate(0, 0, 860).subtract(blk(-80, -40, 870, 380, 300, 40)).subtract(blk(560, 0, 850, 500, 500, 60)).color(worktop));
add("scanner-bed", blk(-80, -40, 840, 380, 300, 40).color(steel));
add("scanner-glass", blk(-80, -40, 880, 300, 220, 4).color('#3c5a66'));
add("scanner-tower", profileXZ([[-260, 0], [-160, 0], [-160, 200], [-200, 230], [-260, 230]], 260).translate(0, -40, 880).color(worktop));
add("scanner-tower-glass", blk(-162, -40, 905, 4, 200, 150).color('#3c5a66'));
add("customer-ledge", blk(-40, -360, 960, 1500, 140, 30).color(worktop));
for (const x of [-700, -40, 620]) add(`ledge-bracket-${x < 0 ? (x < -100 ? 'l' : 'm') : 'r'}`, profileXZ([[0, 0], [30, 0], [30, 100]], 120).rotateZ(90).translate(x, -330, 860).color(steel));
add("ledge-edge", blk(-40, -432, 950, 1500, 6, 40).color(steel));

// Card terminal on a swivel pole facing the shopper.
add("terminal-pole", cylinder(160, 14, 10).translate(250, -300, 896).color(steel));
add("terminal", blk(0, 0, 0, 90, 160, 30).rotateX(35).translate(250, -300, 1056).color('#24282b'));
add("terminal-screen", blk(0, -20, 30, 70, 70, 4).rotateX(35).translate(250, -300, 1056).color('#5cb8d9'));

// Cashier POS screen on a post, cash drawer below the till.
add("pos-post", cylinder(260, 22, 12).translate(-560, 160, 896).color(steel));
add("pos-screen", blk(0, 0, 0, 380, 40, 260).rotateX(15).translate(-560, 150, 1130).color('#1f2326'));
add("pos-glass", blk(0, -22, 20, 340, 6, 220).rotateX(15).translate(-560, 150, 1130).color('#4f9fc4'));
add("cash-drawer", blk(-560, 330, 760, 420, 40, 90).color('#2b2f32'));
add("receipt-printer", blk(-300, 180, 896, 150, 180, 120).color('#2b2f32'));
add("receipt-paper", blk(-300, 88, 1010, 80, 4, 70).color('#f4f1e8'));

// Bagging end: a sunken well, or a three-arm bag carousel.
if (bagging.value === 'well') {
  add("bag-well-floor", blk(560, 0, 500, 500, 500, 12).color(worktop));
  add("bag-well-rim", blk(560, -265, 860, 540, 30, 40).color(steel));
  add("bag", blk(560, 20, 512, 300, 200, 420).color('#f2efe6'));
  add("bag-groceries", blk(520, 20, 932, 120, 120, 60).color('#e0a03a'));
  add("bag-handle", torus(70, 8, 12).rotateX(90).translate(620, 20, 932).color('#f2efe6'));
} else {
  add("carousel-post", cylinder(420, 20, 12).translate(560, 0, 896).color(steel));
  add("bag-well-floor", blk(560, 0, 500, 500, 500, 12).color(worktop));
  for (let k = 0; k < 3; k++) {
    const a = (k * 120 + 30) * Math.PI / 180;
    const x = 560 + 180 * Math.cos(a);
    const y = -180 * Math.sin(a);
    add(`carousel-arm-${k}`, blk(100, 0, 0, 200, 16, 16).rotateZ(-(k * 120 + 30)).translate(560, 0, 1300).color(steel));
    add(`carousel-bag-${k}`, blk(x, y, 1000, 160, 120, 290).color(['#f2efe6', '#d8ecd8', '#f2efe6'][k]));
  }
}

// Lane-number light on a tall pole.
add("lane-pole", cylinder(1300, 25, 12).translate(-860, 280, 896).color(steel));
add("lane-light", cylinder(120, 120, 20).rotateX(90).translate(-860, 340, 2300).color(accent));
add("lane-number-face", profileXZ([[-10, -50], [10, -50], [10, 50], [-10, 50], [-40, 30], [-30, 18], [-10, 30]], 6).translate(-860, 216, 2300).color('#ffffff'));
add("lane-light-ring", torus(120, 10, 20).rotateX(90).translate(-860, 222, 2300).color(steel));

return p.model();
