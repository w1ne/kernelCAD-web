// SPDX-License-Identifier: CC0-1.0
// Driver check-in booth: the weighbridge gatehouse where every inbound truck
// stops so the operator can log the load and issue a ticket. What makes it
// that kiosk rather than a box with glazing: a cabin raised on a concrete
// plinth so the operator's sliding pass window meets the truck cab, a
// stainless deal tray and counter under that window, wraparound glazing
// with corner posts, a flat roof with deep overhang and amber fascia, a
// door with steps and handrail at the back, an AC unit on the side wall,
// and on the lane side a driver intercom pedestal on a gooseneck, a
// red/green traffic light and a striped barrier arm.
// Generic visualization geometry at about real size (cabin 2.6 x 2 m,
// 3.9 m to the roof), millimetres, Z up, truck lane on -X, steps on -Y.

meta({
  name: "driver-check-in-booth",
  license: 'CC0-1.0',
  title: "Driver check-in booth",
  description: "Weighbridge driver check-in booth at about real size: cabin raised on a concrete plinth, sliding pass window with stainless deal tray and counter at truck cab height, wraparound glazing, flat roof with deep overhang and amber fascia, door with steps and handrail, wall AC unit, and on the lane side a gooseneck intercom pedestal, red/green traffic light and striped barrier arm (raised or lowered). Material controls: cladding, frame paint, glass and safety amber. site, weathered, corporate and highVisibility presets.",
  tags: ["recycling", "weighbridge", "gatehouse", "kiosk", "booth", "check-in", "barrier", "traffic light", "intercom", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cladding = param('cladding', '#e2e3df', { label: 'Wall cladding (composite panel)' });
const frame = param('frame', '#2f5d7a', { label: 'Window frames and posts (paint)' });
const glass = param('glass', '#4f9ca8', { label: 'Glass' });
const safetyAmber = param('safetyAmber', '#f0ae32', { label: 'Safety amber (fascia, bollards)' });
const barrier = param('barrier', 'lowered', { choices: ['lowered', 'raised'], label: 'Barrier arm' });

presets({
  site: { cladding: '#e2e3df', frame: '#2f5d7a', glass: '#4f9ca8', safetyAmber: '#f0ae32' },
  weathered: { cladding: '#c4c1b6', frame: '#4a5a62', glass: '#55939a', safetyAmber: '#c99a3c' },
  corporate: { cladding: '#3d4f63', frame: '#2b2f33', glass: '#6fb0c0', safetyAmber: '#2f8f4e' },
  highVisibility: { cladding: '#f2f2ee', frame: '#c8322a', glass: '#4f9ca8', safetyAmber: '#ffd044' },
});

const p = assembly("driver-check-in-booth");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

// Concrete plinth and the cabin on it.
const W = 2000, D = 2600, PZ = 700, CH = 2700, WIN0 = 1000, WIN1 = 2250;
add("plinth", blk(0, 0, 0, W + 600, D + 600, PZ).color('#a7a39a'));
add("plinth-kerb", blk(-W / 2 - 300, 0, 0, 200, D + 600, PZ + 120).color(safetyAmber));
add("cabin-base", blk(0, 0, PZ, W, D, WIN0).color(cladding));
add("cabin-head", blk(0, 0, PZ + WIN1, W, D, CH - WIN1).color(cladding));
add("glazing", blk(0, 0, PZ + WIN0, W - 40, D - 40, WIN1 - WIN0).color(glass));
for (const x of [-W / 2 + 40, W / 2 - 40]) for (const y of [-D / 2 + 40, D / 2 - 40]) {
  add(`corner-post-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x, y, PZ + WIN0, 90, 90, WIN1 - WIN0).color(frame));
}
add("mullion-lane", blk(-W / 2 - 5, 350, PZ + WIN0, 70, 60, WIN1 - WIN0).color(frame));
add("mullion-front", blk(0, -D / 2 - 5, PZ + WIN0, 60, 70, WIN1 - WIN0).color(frame));
add("sill-band", blk(0, 0, PZ + WIN0 - 50, W + 30, D + 30, 60).color(frame));

// Sliding pass window, counter and deal tray on the lane side (-X).
add("pass-window-frame", blk(-W / 2 - 25, -450, PZ + WIN0 + 80, 30, 1000, 900).color(frame));
add("pass-window-slider", blk(-W / 2 - 45, -660, PZ + WIN0 + 120, 20, 520, 820).color('#7fbcc6'));
add("counter-shelf", blk(-W / 2 - 220, -450, PZ + WIN0 - 40, 440, 1100, 40).color('#b8bec0'));
add("deal-tray", blk(-W / 2 - 140, -450, PZ + WIN0, 260, 420, 70).subtract(blk(-W / 2 - 140, -450, PZ + WIN0 + 20, 220, 380, 80)).color('#c4c9cb'));
for (const y of [-900, 0]) add(`counter-bracket-${y + 1000}`, box(320, 30, 30, true).rotateY(-40).translate(-W / 2 - 120, y, PZ + WIN0 - 160).color(frame));
add("ticket-printer-slot", blk(-W / 2 - 15, 200, PZ + WIN0 + 100, 20, 300, 60).color('#2b2f33'));
add("booth-sign", blk(-W / 2 - 12, -450, PZ + WIN1 + 120, 14, 1600, 300).color(frame));
add("booth-sign-text", blk(-W / 2 - 22, -450, PZ + WIN1 + 200, 10, 1100, 140).color('#f2f2ee'));

// Roof with deep overhang, amber fascia and a slight fall to the back.
const RZ = PZ + CH;
add("roof-slab", box(W + 1400, D + 900, 160, true).rotateX(-1.5).translate(-200, 0, RZ + 90).color(cladding));
add("fascia-front", blk(-200, -D / 2 - 450, RZ + 30, W + 1400, 30, 220).color(safetyAmber));
add("fascia-lane", blk(-W / 2 - 900, 0, RZ + 30, 30, D + 900, 220).color(safetyAmber));
add("fascia-back", blk(-200, D / 2 + 450, RZ, W + 1400, 30, 200).color(safetyAmber));
add("downlight", cylinder(30, 110, 10).translate(-W / 2 - 500, -450, RZ - 30).color('#fff4c8'));

// Door with steps and handrail at the back-left (-Y side).
add("door", blk(500, -D / 2 - 15, PZ, 900, 30, 2150).color(frame));
add("door-glass", blk(500, -D / 2 - 32, PZ + 1150, 500, 10, 700).color(glass));
add("door-handle", blk(150, -D / 2 - 50, PZ + 1000, 30, 40, 200).color('#c4c9cb'));
for (let k = 0; k < 3; k++) add(`step-${k}`, blk(500, -D / 2 - 300 - 520 + k * 220, 0, 1100, 260 + (2 - k) * 220 + 40, (k + 1) * (PZ / 4)).color('#9a958b'));
const railLen = Math.hypot(700, 600), railAng = (Math.atan2(600, 700) * 180) / Math.PI;
add("handrail", box(40, railLen, 40, true).rotateX(railAng).translate(1100, -D / 2 - 650, PZ + 500).color(frame));
add("handrail-post-low", blk(1100, -D / 2 - 960, 0, 50, 50, 900).color(frame));
add("handrail-post-high", blk(1100, -D / 2 - 340, 0, 50, 50, PZ + 1150).color(frame));

// AC unit on the +X wall.
add("ac-unit", blk(W / 2 + 160, 400, PZ + 1700, 300, 800, 550).color('#d8dad6'));
add("ac-fan", cylinder(20, 200, 16).rotateY(90).translate(W / 2 + 310, 400, PZ + 1975).color('#5d6366'));

// Corner bollards on the lane side.
for (const y of [-D / 2 - 300, D / 2 + 300]) {
  add(`bollard-${y > 0 ? 'b' : 'f'}`, cylinder(1100, 90, 12).translate(-W / 2 - 520, y, 0).color(safetyAmber));
  add(`bollard-band-${y > 0 ? 'b' : 'f'}`, cylinder(120, 92, 12).translate(-W / 2 - 520, y, 800).color('#2b2f33'));
}

// Gooseneck intercom pedestal and traffic light in the lane.
const IX = -W / 2 - 2200, IY = -D / 2 - 200;
add("intercom-base", blk(IX, IY, 0, 400, 400, 20).color('#5d6366'));
add("intercom-post", cylinder(1700, 50, 10).translate(IX, IY, 20).color(frame));
add("gooseneck", torus(350, 50, 16).subtract(blk(0, 0, -400, 900, 200, 400)).subtract(blk(-400, 0, 0, 800, 200, 500))
  .rotateX(90).translate(IX + 350, IY, 1720).color(frame));
add("intercom-head", blk(IX + 700, IY, 1500, 260, 220, 420).color('#c4c9cb'));
add("intercom-speaker", cylinder(15, 70, 10).rotateY(-90).translate(IX + 570, IY, 1800).color('#2b2f33'));
add("card-reader", blk(IX + 562, IY, 1600, 10, 120, 120).color('#2b2f33'));
const TX = IX, TY = D / 2 + 400;
add("light-pole", cylinder(2700, 55, 10).translate(TX, TY, 0).color(frame));
add("light-head", blk(TX, TY - 80, 2000, 300, 200, 650).color('#2b2f33'));
add("light-red", cylinder(30, 100, 12).rotateX(90).translate(TX, TY - 180, 2470).color('#d62f2a'));
add("light-green", cylinder(30, 100, 12).rotateX(90).translate(TX, TY - 180, 2180).color('#2f9a4f'));
for (const z of [2470, 2180]) add(`visor-${z}`, box(240, 140, 20, true).rotateX(20).translate(TX, TY - 240, z + 120).color('#2b2f33'));

// Barrier cabinet and striped arm across the lane.
const BX = -W / 2 - 800, BY = D / 2 + 300, ARM = 3200;
add("barrier-cabinet", blk(BX, BY, 0, 320, 380, 1050).color(safetyAmber));
add("barrier-cap", blk(BX, BY, 1050, 360, 420, 40).color('#2b2f33'));
const raised = barrier.value === 'raised';
for (let k = 0; k < 8; k++) {
  const seg = ARM / 8;
  const piece = box(seg, 70, 110, true).translate(-seg / 2 - k * seg, 0, 0);
  add(`arm-${k}`, (raised ? piece.rotateY(80) : piece).translate(BX - 160, BY, 950).color(k % 2 ? '#f2f2ee' : '#d62f2a'));
}
if (!raised) add("arm-rest", blk(BX - 160 - ARM + 100, BY, 0, 120, 120, 880).color(safetyAmber));

return p.model();
