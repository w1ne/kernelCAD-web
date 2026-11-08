// SPDX-License-Identifier: CC0-1.0
// Customer service desk: the returns and enquiries counter near a store
// entrance. What makes it a service desk rather than a cabinet: a curved
// front with a dark kick and a lit accent band, a raised customer ledge
// over a lower staff worktop, an "i" information plaque on the front, a
// lowered wheelchair-height return with open knee space, a ticket
// "take a number" dispenser, desk bell, card terminal and brochure rack
// on the ledge, a POS monitor and parcels on the staff side, and an
// illuminated header sign on two posts. Generic visualization geometry at
// about real size (2.4 m wide, 2.2 m tall), millimetres, Z up, customer
// side on -Y.

meta({
  name: "customer-service-desk",
  license: 'CC0-1.0',
  title: "Customer service desk",
  description: "Store customer service counter at about real size: curved laminate front with kick and accent band, raised customer ledge over a staff worktop, information plaque, lowered accessible return with knee space, ticket dispenser, desk bell, card terminal, brochure rack, POS monitor, parcels and a header sign on posts. Material controls: laminate body, worktop, accent signage, metal posts. supermarket, department and diyStore presets; accessible return choice.",
  tags: ['service desk', 'customer service', 'returns desk', 'information desk', 'counter', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const laminate = param('laminate', '#7d6650', { label: 'Laminate body' });
const worktop = param('worktop', '#e8e2d6', { label: 'Worktop and ledge' });
const accent = param('accent', '#d0562a', { label: 'Accent band and signage' });
const metal = param('metal', '#9aa4a8', { label: 'Metal posts and stands' });
const section = param('section', 'accessible', { choices: ['accessible', 'straight'], label: 'Lowered return' });

presets({
  supermarket: { laminate: '#7d6650', worktop: '#e8e2d6', accent: '#d0562a', metal: '#9aa4a8' },
  department: { laminate: '#2e3236', worktop: '#f2efe8', accent: '#b8975a', metal: '#c9ccce' },
  diyStore: { laminate: '#e4e6e3', worktop: '#9a7b55', accent: '#f08a1c', metal: '#4a5257' },
});

const p = assembly("customer-service-desk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Curved plan: the front bows out to y = -300 at the centre, -150 at the ends.
const HW = 900;
const YB = 300;
const frontY = (x: number) => -300 + 150 * (x / HW) * (x / HW);
const arcPts = (off: number) => {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const x = -HW + off + ((2 * HW - 2 * off) * i) / 12;
    pts.push([x, frontY(x) + off]);
  }
  return pts;
};
const plan = (off: number) => [...arcPts(off), [HW - off, YB - off], [-HW + off, YB - off]];
const crescent = (a: number, b: number) => [...arcPts(a), ...arcPts(b).reverse()];
const slab = (pts, z: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z);

const WORK = 760;
const LEDGE = 1000;

// Counter body: kick, low staff body, raised front, accent band, ledge.
add("kick", slab(plan(30), 0, 100).color('#2b2f33'));
add("body", slab(plan(0), 100, WORK - 140).color(laminate));
add("worktop", slab(plan(-10), WORK - 40, 40).color(worktop));
add("raised-front", slab(crescent(0, 170), 100, LEDGE - 100).color(laminate));
add("accent-band", slab(crescent(-6, 4), 820, 50).color(accent));
add("ledge", slab(crescent(-60, 190), LEDGE, 40).color(worktop));
for (const [k, x] of [['l', -560], ['r', 560]]) add(`groove-${k}`, blk(x, frontY(x) - 3, 140, 10, 8, 660).color('#2b2f33'));

// Information plaque on the front.
add("plaque", blk(0, -304, 380, 360, 8, 340).color(worktop));
add("info-disc", cylinder(8, 110, 20).rotateX(90).translate(0, -308, 570).color(accent));
add("info-stem", blk(0, -318, 500, 30, 4, 100).color(worktop));
add("info-dot", cylinder(4, 18, 10).rotateX(90).translate(0, -318, 630).color(worktop));
add("plaque-text", blk(0, -312, 420, 240, 4, 36).color('#2b2f33'));

// Lowered wheelchair-height return with open knee space.
if (section.value === 'accessible') {
  add("return-end", blk(1480, 75, 0, 40, 450, WORK - 40).color(laminate));
  add("return-modesty", blk(1190, 280, 100, 580, 40, WORK - 140).color(laminate));
  add("return-top", blk(1200, 75, WORK - 40, 600, 450, 40).color(worktop));
  add("return-edge", blk(1200, -152, WORK - 40, 600, 6, 40).color(accent));
  add("access-sign", blk(1190, 256, 360, 160, 4, 160).color('#2a62b8'));
  add("access-wheel", cylinder(4, 40, 14).rotateX(90).translate(1180, 254, 410).color('#f4f1ea'));
  add("access-figure", blk(1195, 252, 440, 18, 4, 70).color('#f4f1ea'));
  add("pen-holder", cylinder(90, 30, 12).translate(1350, -40, WORK).color(metal));
  add("form-pad", blk(0, 0, WORK, 210, 290, 12).rotateZ(-8).translate(1150, -40, 0).color('#f4f1ea'));
}

// On the customer ledge: ticket dispenser, bell, card terminal, brochure rack.
const L = LEDGE + 40;
add("ticket-post", cylinder(160, 14, 10).translate(-700, frontY(-700) + 60, L).color(metal));
add("ticket-dispenser", cylinder(150, 70, 16).translate(-700, frontY(-700) + 60, L + 160).color('#c8232c'));
add("ticket-tab", blk(-700, frontY(-700) - 14, L + 200, 50, 10, 40).color('#f4f1ea'));
add("bell", turned([[0, 0], [48, 0], [46, 12], [34, 30], [12, 40], [0, 42]]).translate(-380, frontY(-380) + 70, L).color('#d8b24a'));
add("bell-button", cylinder(14, 6, 8).translate(-380, frontY(-380) + 70, L + 42).color('#d8b24a'));
add("card-terminal", blk(0, 0, 0, 90, 160, 40).rotateX(-16).translate(260, frontY(260) + 80, L).color('#2b2f33'));
add("card-screen", blk(0, 0, 0, 70, 60, 4).rotateX(-16).translate(260, frontY(260) + 100, L + 36).color('#7fd0e6'));
add("brochure-base", blk(620, frontY(620) + 90, L, 260, 130, 30).color(metal));
['#2f6fd0', '#f2b632', '#4f9a52'].forEach((c, i) => {
  add(`brochure-${i}`, blk(0, 0, 0, 70, 14, 190).rotateX(-14).translate(540 + i * 80, frontY(620) + 90, L + 20).color(c));
});

// Staff side: POS monitor, keyboard, parcels.
add("monitor-stand", cylinder(220, 18, 10).translate(-280, 130, WORK).color(metal));
add("monitor-foot", blk(-280, 130, WORK, 200, 160, 12).color(metal));
add("monitor", blk(0, 0, 0, 460, 40, 300).rotateX(-8).translate(-280, 120, WORK + 200).color('#2b2f33'));
add("keyboard", blk(-280, 30, WORK, 380, 130, 20).color('#3a3f43'));
add("parcel-a", blk(420, 150, WORK, 300, 220, 200).color('#b98a52'));
add("parcel-b", blk(440, 140, WORK + 200, 220, 180, 140).color('#c79a62'));
add("parcel-label", blk(420, 38, WORK + 80, 120, 4, 80).color('#f4f1ea'));

// Header sign on two posts behind the counter.
for (const [k, x] of [['l', -700], ['r', 700]]) add(`sign-post-${k}`, cylinder(1240, 25, 10).translate(x, YB - 40, WORK).color(metal));
add("sign", blk(0, YB - 40, 1900, 1700, 60, 300).color(accent));
add("sign-face", blk(0, YB - 72, 1920, 1640, 4, 260).color(laminate));
add("sign-info-disc", cylinder(6, 100, 20).rotateX(90).translate(-640, YB - 74, 2050).color(accent));
add("sign-info-stem", blk(-640, YB - 82, 1985, 26, 4, 90).color('#f4f1ea'));
add("sign-info-dot", cylinder(4, 16, 10).rotateX(90).translate(-640, YB - 82, 2100).color('#f4f1ea'));
[[-230, 300], [90, 220], [470, 380]].forEach(([x, w], i) => add(`sign-word-${i}`, blk(x, YB - 80, 2030, w, 6, 70).color('#f4f1ea')));
add("sign-subline", blk(80, YB - 80, 1950, 820, 6, 30).color(worktop));

return p.model();
