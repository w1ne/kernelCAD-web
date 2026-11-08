// SPDX-License-Identifier: CC0-1.0
// Parcel locker bank: the self-service pickup lockers in a supermarket
// lobby. What makes it a parcel locker rather than a cabinet: two columns
// of doors in three sizes (small, medium, large) with recessed pulls and
// number tags, a central terminal column with a touch screen, barcode
// scanner window, keypad and card reader, one large door swung open with
// a taped parcel inside, a branded canopy header and a kick plinth.
// Generic visualization geometry at about real size (1.65 m wide, 2.2 m
// tall), millimetres, Z up, front on -Y.

meta({
  name: "parcel-locker-bank",
  license: 'CC0-1.0',
  title: "Parcel locker bank",
  description: "Self-service parcel locker bank at about real size: two columns of small, medium and large doors with recessed pulls and number tags, a central terminal with touch screen, scanner window, keypad and card reader, one large door open with a taped parcel inside, branded canopy header and kick plinth. Material controls: cabinet body, locker doors, screen glass, brand accent. postalYellow, retailGrey and ecoGreen presets; open-door choice.",
  tags: ['parcel locker', 'pickup locker', 'click and collect', 'self service', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#3b4248', { label: 'Cabinet body' });
const doors = param('doors', '#f2c230', { label: 'Locker doors' });
const glass = param('glass', '#1d2a33', { label: 'Screen glass' });
const accent = param('accent', '#c8232c', { label: 'Brand accent' });
const openDoor = param('openDoor', 'open', { choices: ['open', 'closed'], label: 'Large door' });

presets({
  postalYellow: { body: '#3b4248', doors: '#f2c230', glass: '#1d2a33', accent: '#c8232c' },
  retailGrey: { body: '#d9dee0', doors: '#9aa5ab', glass: '#22303a', accent: '#1f6fb5' },
  ecoGreen: { body: '#2f3a33', doors: '#7aa13d', glass: '#1b2620', accent: '#e8e1cc' },
});

const p = assembly("parcel-locker-bank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const COL = 540;
const GAP = 12;
const D = 600;
const Z0 = 120;
const ZT = 2000;
const YF = -D / 2;
// Door heights from the bottom up, per side column; the large door at the bottom left opens.
const stacks = { l: [560, 360, 360, 200, 200], r: [560, 360, 200, 200, 200, 120] };
const xs = { l: -COL, r: COL };
const openBay = { x: -COL, z: Z0 + GAP, w: COL - 2 * GAP, h: 560 - GAP };

// Cabinet with a pocket behind the open door.
let cab = blk(0, 0, Z0, 3 * COL + 20, D, ZT - Z0);
if (openDoor.value === 'open') cab = cab.subtract(blk(openBay.x, YF + 230, openBay.z, openBay.w, 460, openBay.h));
add("cabinet", cab.color(body));
add("plinth", blk(0, 20, 0, 3 * COL, D - 40, Z0).color('#1a1c1e'));
if (openDoor.value === 'open') {
  add("parcel", blk(openBay.x - 30, YF + 230, openBay.z, 380, 300, 260).color('#b8895a'));
  add("parcel-tape", blk(openBay.x - 30, YF + 78, openBay.z + 200, 60, 4, 60).color('#d9c9a8'));
  add("parcel-label", blk(openBay.x - 110, YF + 78, openBay.z + 80, 120, 4, 80).color('#f4f2ea'));
  add("parcel-tape-top", blk(openBay.x - 30, YF + 230, openBay.z + 260, 60, 300, 3).color('#d9c9a8'));
}

// Locker doors with recessed pulls, number tags and status LEDs.
let n = 1;
for (const k of ['l', 'r']) {
  let z = Z0 + GAP;
  for (const [i, h] of stacks[k].entries()) {
    const x = xs[k];
    const w = COL - 2 * GAP;
    const dh = h - GAP;
    const door = blk(0, -8, 0, w, 16, dh);
    const pull = blk(w / 2 - 50, -22, dh / 2 - 60, 24, 14, 120);
    const tag = blk(-w / 2 + 50, -18, dh - 50, 60, 4, 30);
    const led = cylinder(4, 7, 8).rotateX(90).translate(-w / 2 + 100, -16, dh - 35);
    if (k === 'l' && i === 0 && openDoor.value === 'open') {
      // Hinged on its left edge, swung out toward the shopper.
      const hinge = (s: Shape) => s.translate(w / 2, 0, 0).rotateZ(-105).translate(x - w / 2, YF, z);
      add(`door-${n}`, hinge(door).color(doors));
      add(`door-pull-${n}`, hinge(pull).color('#1a1c1e'));
      add(`door-tag-${n}`, hinge(tag).color('#f4f2ea'));
      add(`door-led-${n}`, hinge(led).color('#3ad86a'));
    } else {
      add(`door-${n}`, door.translate(x, YF, z).color(doors));
      add(`door-pull-${n}`, pull.translate(x, YF, z).color('#1a1c1e'));
      add(`door-tag-${n}`, tag.translate(x, YF, z).color('#f4f2ea'));
      add(`door-led-${n}`, led.translate(x, YF, z).color('#d8282f'));
    }
    z += h;
    n++;
  }
}

// Central terminal column: screen, scanner, keypad, card reader, receipt slot and two small doors.
add("terminal-face", blk(0, YF - 6, Z0 + GAP, COL - 2 * GAP, 12, ZT - Z0 - 2 * GAP).color(accent));
add("screen-bezel", blk(0, YF - 16, 1350, 380, 12, 300).color('#1a1c1e'));
add("screen", blk(0, YF - 20, 1370, 340, 6, 260).color(glass));
add("screen-ui", blk(-60, YF - 24, 1520, 180, 3, 40).color('#f4f2ea'));
add("screen-button", blk(80, YF - 24, 1400, 120, 3, 50).color(doors));
add("scanner", blk(0, YF - 20, 1220, 200, 20, 80).color('#1a1c1e'));
add("scanner-window", blk(0, YF - 31, 1240, 150, 3, 40).color('#d8282f'));
// Keypad tilted back so its face looks up at the user.
const pad = (sh: Shape) => sh.rotateX(-20).translate(0, YF - 20, 960);
add("keypad-housing", pad(blk(0, -20, 0, 210, 40, 200)).color('#2b2f33'));
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 3; c++) add(`key-${r}-${c}`, pad(blk(-60 + c * 60, -42, 22 + r * 42, 40, 6, 30)).color('#c9cfd2'));
}
add("card-reader", blk(0, YF - 40, 860, 160, 40, 70).color('#1a1c1e'));
add("card-slot", blk(0, YF - 61, 895, 110, 3, 8).color(doors));
add("receipt-slot", blk(0, YF - 16, 800, 140, 8, 14).color('#1a1c1e'));
for (const [i, z] of [[0, Z0 + 2 * GAP], [1, Z0 + 2 * GAP + 300]]) {
  add(`terminal-door-${i}`, blk(0, YF - 18, z, COL - 80, 10, 280).color(doors));
  add(`terminal-pull-${i}`, blk(180, YF - 26, z + 100, 24, 8, 90).color('#1a1c1e'));
}

// Canopy header with brand stripe and logo.
add("canopy", blk(0, -40, ZT, 3 * COL + 80, D + 120, 200).color(body));
add("canopy-stripe", blk(0, YF - 103, ZT + 30, 3 * COL + 60, 6, 40).color(accent));
add("logo-panel", blk(-200, YF - 104, ZT + 90, 600, 6, 80).color(doors));
add("logo-mark", cylinder(6, 50, 16).rotateX(90).translate(250, YF - 101, ZT + 120).color(accent));

return p.model();
