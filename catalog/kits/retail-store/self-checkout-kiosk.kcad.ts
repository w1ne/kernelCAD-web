// SPDX-License-Identifier: CC0-1.0
// Self-checkout kiosk: the till a shopper runs alone.
// What makes it a self-checkout rather than a counter: a waist-high cabinet
// with a scan bed on the left (flat glass plate plus an upright scanner window,
// the bioptic layout), a weighing bagging area on the right with a bag
// carousel, a touchscreen tilted back on a column between them, a card
// terminal and receipt slot beside the screen, a cash module on the cabinet
// front, and a status-light pole on top that lights up when staff are needed.
// Generic visualization geometry at about real size (900 x 600 mm cabinet,
// about 1.75 m to the top of the light), millimetres, Z up, customer side
// toward -Y, plinth on z = 0.

meta({
  name: "self-checkout-kiosk",
  license: 'CC0-1.0',
  title: "Self-checkout kiosk",
  description: "Self-checkout kiosk at about real size: cabinet with a glass scan bed and upright bioptic scanner window, weighing bagging area with a bag carousel, tilted touchscreen on a column, card terminal, receipt slot, cash module on the front and a status-light pole. Material controls: cabinet, worktop, screen glass, status light / brand accent. cleanStore, nightRestock and discounter presets.",
  tags: ['self-checkout', 'self checkout', 'SCO', 'kiosk', 'checkout', 'till', 'POS', 'scanner', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#e6eaeb', { label: 'Cabinet (powder-coated steel)' });
const worktop = param('worktop', '#9aa4a8', { label: 'Worktop and scale plate (stainless)' });
const glass = param('glass', '#3a8fa8', { label: 'Screen and scanner glass' });
const accent = param('accent', '#2f7fd0', { label: 'Status light and brand stripe' });

presets({
  cleanStore: { cabinet: '#e6eaeb', worktop: '#9aa4a8', glass: '#3a8fa8', accent: '#2f7fd0' },
  nightRestock: { cabinet: '#2c3439', worktop: '#5f6a6f', glass: '#1f4f5f', accent: '#d8a12a' },
  discounter: { cabinet: '#f2d23a', worktop: '#b7bfc2', glass: '#30707f', accent: '#c8302c' },
});

const p = assembly("self-checkout-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Extrude a (y, z) side profile across X, centred on x = cx.
const side = (pts: [number, number][], width: number, cx = 0) => extrudePolygon(pts, width).rotateX(90).rotateZ(90).translate(cx - width / 2, 0, 0);

const W = 900;
const TOP = 880;

// Cabinet: recessed plinth, then a body whose front leans out under the
// worktop so the shopper's knees clear it.
add("plinth", blk(0, 20, 0, W - 40, 520, 90).color(worktop));
add("cabinet", side([[-250, 90], [280, 90], [280, TOP], [-290, TOP], [-290, 820], [-250, 760]], W).color(cabinet));
add("brand-stripe", side([[-292, 830], [-288, 830], [-288, 860], [-292, 860]], W - 20).color(accent));
add("worktop", blk(0, -5, TOP, W + 20, 600, 24).color(worktop));

// Cash module on the front: note slot, coin cup and a receipt-out lip.
add("cash-panel", blk(-150, -258, 420, 300, 12, 300).color(worktop));
add("note-slot", blk(-150, -266, 640, 180, 6, 14).color(glass));
add("coin-cup", cylinder(40, 55, 14).rotateX(90).translate(-150, -224, 500).subtract(cylinder(30, 42, 14).rotateX(90).translate(-150, -234, 500)).color(cabinet));
add("coin-slot", blk(-150, -266, 590, 60, 6, 10).color(glass));
add("door-seam", blk(150, -253, 160, 4, 6, 560).color(worktop));

// Scan bed on the left: flush glass plate and the upright bioptic tower.
add("scan-plate", blk(-230, -90, TOP + 24, 300, 260, 6).color(glass));
add("scan-frame", blk(-230, -90, TOP + 24, 330, 290, 4).subtract(blk(-230, -90, TOP + 20, 302, 262, 12)).color(worktop));
add("bioptic-tower", side([[50, TOP + 24], [130, TOP + 24], [130, TOP + 210], [70, TOP + 230], [50, TOP + 210]], 340, -230).color(cabinet));
add("bioptic-window", side([[44, TOP + 50], [50, TOP + 50], [50, TOP + 190], [44, TOP + 190]], 260, -230).color(glass));

// Bagging area on the right: scale plate and a two-arm bag carousel.
add("bag-scale", blk(250, -60, TOP + 24, 360, 380, 14).color(worktop));
add("carousel-post", cylinder(420, 16, 10).translate(250, 150, TOP + 24).color(worktop));
for (const s of [-1, 1]) {
  add(`carousel-arm-${s < 0 ? 'l' : 'r'}`, cylinder(300, 9, 8).rotateX(90).translate(250 + s * 130, 140, TOP + 420).color(worktop));
  add(`carousel-hook-${s < 0 ? 'l' : 'r'}`, cylinder(30, 9, 8).translate(250 + s * 130, -160, TOP + 400).color(worktop));
}
add("carousel-bar", cylinder(260, 12, 8).rotateY(90).translate(120, 150, TOP + 420).color(worktop));
add("bag", side([[-140, TOP + 38], [120, TOP + 38], [100, TOP + 380], [-120, TOP + 380]], 250, 250).color(cabinet));
add("bag-handle-l", blk(250 - 130, -10, TOP + 380, 10, 160, 40).color(cabinet));
add("bag-handle-r", blk(250 + 130, -10, TOP + 380, 10, 160, 40).color(cabinet));

// Screen column and the touchscreen tilted back toward the shopper.
add("screen-column", blk(0, 200, TOP + 24, 130, 90, 330).color(cabinet));
const TILT = -18;
const onScreen = (shape: Shape) => shape.rotateX(TILT).translate(0, 150, TOP + 470);
add("screen-housing", onScreen(blk(0, 0, -170, 520, 70, 340)).color(cabinet));
add("screen", onScreen(blk(0, -38, -150, 470, 6, 290)).color(glass));
add("screen-bezel-lip", onScreen(blk(0, -38, -170, 520, 8, 20)).color(worktop));

// Card terminal on a short stalk and the receipt slot under the screen.
add("terminal-stalk", cylinder(110, 14, 10).translate(-60, -10, TOP + 24).color(worktop));
add("terminal", blk(0, 0, -15, 90, 150, 30).rotateX(30).translate(-60, -10, TOP + 140).color(cabinet));
add("terminal-screen", blk(0, 20, 15, 70, 50, 3).rotateX(30).translate(-60, -10, TOP + 140).color(glass));
add("terminal-keys", blk(0, -35, 15, 64, 50, 3).rotateX(30).translate(-60, -10, TOP + 140).color(worktop));
add("receipt-slot", blk(0, 150, TOP + 300, 110, 10, 8).color(glass));

// Status-light pole: thin mast with a coloured beacon and a lane number disc.
add("light-mast", cylinder(400, 14, 10).translate(0, 230, TOP + 354).color(worktop));
add("beacon", cylinder(110, 48, 16).translate(0, 230, TOP + 754).color(accent));
add("beacon-cap", sphere(48).scale([1, 1, 0.45]).translate(0, 230, TOP + 864).color(cabinet));
add("lane-disc", cylinder(10, 75, 18).rotateX(90).translate(0, 222, TOP + 640).color(cabinet));
add("lane-number", blk(0, 210, TOP + 610, 40, 4, 60).color(accent));

return p.model();
