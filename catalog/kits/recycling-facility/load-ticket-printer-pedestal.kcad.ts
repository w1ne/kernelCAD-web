// SPDX-License-Identifier: CC0-1.0
// Load-ticket printer pedestal: the unattended kiosk at the weighbridge where
// a driver reaches out of the cab window, taps a card, talks to the scale
// house and pulls out a printed weight ticket. What makes it that kiosk
// rather than a post: a goose-neck column leaning the head out toward the
// cab, an angled head with a rain hood, a screen, keypad, card reader,
// intercom grille and a ticket slot with a ticket hanging out, a camera and
// a beacon on top, all behind a yellow crash bollard on a concrete plinth.
// Generic visualization geometry at about real size (cab-height head at
// about 2.0 m), millimetres, Z up, the driver-facing side on -Y.

meta({
  name: "load-ticket-printer-pedestal",
  license: 'CC0-1.0',
  title: "Load-ticket printer pedestal",
  description: "Weighbridge load-ticket kiosk at about real size: goose-neck column on a concrete plinth leaning an angled head toward the cab window, rain hood, screen, keypad, card reader, intercom grille, ticket slot with a printed ticket, camera and amber beacon, protected by a yellow crash bollard. Material controls: housing paint, column and bollard, plinth concrete and fascia. site, weathered, stainless and corporate presets.",
  tags: ["recycling", "weighbridge", "ticket printer", "scale house", "driver kiosk", "load ticket", "intercom", "materials recovery", "waste management", "site equipment", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#2f5d9a', { label: 'Head and hood (paint)' });
const column = param('column', '#f0c419', { label: 'Column and crash bollard' });
const concrete = param('concrete', '#8f918a', { label: 'Plinth (concrete)' });
const fascia = param('fascia', '#2b2f33', { label: 'Fascia, keypad and screen frame' });

presets({
  site: { housing: '#2f5d9a', column: '#f0c419', concrete: '#8f918a', fascia: '#2b2f33' },
  weathered: { housing: '#4f6070', column: '#b89a3a', concrete: '#7d7a70', fascia: '#3a3a36' },
  stainless: { housing: '#c4c9cb', column: '#9aa3a8', concrete: '#a3a59e', fascia: '#3a3f44' },
  corporate: { housing: '#2f7a4a', column: '#e6e6e2', concrete: '#8f918a', fascia: '#1f2224' },
});

const p = assembly("load-ticket-printer-pedestal");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 14) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

// Head geometry: tilted 20° back so its face looks up at the cab window.
const TILT = 20, HY = -380, HZ = 1700; // head base centre
const onFace = (s: Shape, z: number) => s.translate(0, 0, z).rotateX(-TILT).translate(0, HY, HZ);

// Plinth, crash bollard and goose-neck column.
add("plinth", blk(0, 0, 0, 900, 900, 200).color(concrete));
add("plinth-chamfer", blk(0, 0, 200, 820, 820, 30).color(concrete));
add("column", cylinder(1020, 75, 16).translate(0, 120, 230).color(column));
add("column-neck", rod([0, 120, 1240], [0, HY + 40, HZ - 40], 75).color(column));
add("neck-elbow", sphere(75).translate(0, 120, 1240).color(column));
add("base-flange", cylinder(30, 140, 16).translate(0, 120, 230).color(fascia));
add("bollard", cylinder(1000, 110, 16).translate(-30, -330, 230).color(column));
add("bollard-cap", sphere(110).translate(-30, -330, 1230).color(column));
for (const z of [600, 950]) add(`bollard-band-${z}`, cylinder(70, 114, 16).translate(-30, -330, z).color(fascia));

// Head housing with screen, keypad, card reader, intercom and ticket slot on the -Y face.
add("head", onFace(blk(0, 0, 0, 560, 260, 620), 0).color(housing));
add("rain-hood", onFace(profileYZ([[-170, 620], [130, 620], [130, 660], [-260, 660], [-260, 640]], 640), 0).color(housing));
add("fascia", onFace(blk(0, -132, 30, 480, 6, 560), 0).color(fascia));
add("screen", onFace(blk(0, -137, 400, 300, 6, 170), 0).color('#3f8fc8'));
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) add(`key-${r}-${c}`, onFace(blk(-150 + c * 55, -138, 120 + r * 55, 40, 10, 40), 0).color('#d4d8dc'));
add("card-reader", onFace(blk(120, -150, 220, 130, 40, 150), 0).color('#e6e6e2'));
add("card-reader-led", onFace(blk(120, -172, 340, 60, 6, 15), 0).color('#3aa65a'));
for (let k = 0; k < 4; k++) add(`intercom-slot-${k}`, onFace(blk(120, -137, 90 + k * 22, 100, 6, 10), 0).color('#5a5f63'));
add("ticket-slot", onFace(blk(0, -140, 330, 220, 12, 30), 0).color('#0d0f10'));
add("ticket", onFace(blk(0, -150, 260, 160, 3, 90), 0).color('#f7f5ec'));
add("ticket-print", onFace(blk(0, -153, 290, 110, 3, 10), 0).color('#3a3a36'));
add("call-button", onFace(cylinder(16, 26, 12).rotateX(90).translate(170, -138, 470), 0).color('#3aa65a'));

// Camera arm and beacon on top.
add("camera-arm", rod([200, HY + 80, HZ + 650], [200, HY - 150, HZ + 700], 18, 8).color(fascia));
add("camera", blk(200, HY - 230, HZ + 650, 90, 190, 90).color('#e6e6e2'));
add("camera-lens", cylinder(20, 30, 10).rotateX(90).translate(200, HY - 325, HZ + 695).color('#0d0f10'));
add("beacon-base", cylinder(40, 70, 12).translate(-170, HY + 140, HZ + 600).color(fascia));
add("beacon", cylinder(120, 60, 12).translate(-170, HY + 140, HZ + 640).color('#f0ae32'));
add("beacon-cap", sphere(60).translate(-170, HY + 140, HZ + 760).color('#f0ae32'));

// Conduit down the back into the plinth.
add("conduit", cylinder(950, 25, 8).translate(0, 215, 230).color(fascia));

return p.model();
