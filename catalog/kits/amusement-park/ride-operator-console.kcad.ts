// SPDX-License-Identifier: CC0-1.0
// Ride operator console: the dispatch desk at the station of a coaster or
// flat ride, where the operator checks restraints and sends the train.
// What makes it a ride console rather than a lectern: a sloped control desk
// on a cabinet pedestal, a big red mushroom emergency stop in a yellow guard
// collar, the two green dispatch buttons spaced for two hands, a key switch, a
// selector knob, a row of pilot lamps and a status screen, raised side cheeks,
// a red/amber/green stack light on a mast, a PA gooseneck microphone, a
// yellow kick plate and an anti-fatigue mat in front.
// Generic visualization geometry at about real size (about 0.9 m wide, 0.8 m
// deep, 1.9 m to the stack light), millimetres, Z up, operator side on -Y,
// standing on z = 0.
meta({
  name: "ride-operator-console",
  license: "CC0-1.0",
  title: "Ride operator console",
  description: "Ride station dispatch console at about real size: sloped control desk on a cabinet pedestal with a red mushroom emergency stop in a yellow guard collar, two-hand green dispatch buttons, key switch, selector knob, pilot lamps and status screen, raised side cheeks, a red/amber/green stack light on a mast, PA gooseneck microphone, yellow kick plate and anti-fatigue mat. Material controls: powder-coated housing, anodised control panel, safety-yellow paint, signal red. Station blue, festival and twilight presets.",
  tags: ["ride console", "operator panel", "dispatch", "emergency stop", "stack light", "control desk", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 5000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#2f5f7a", { label: "Powder-coated housing and cheeks" });
const anodised = param("anodised", "#2b3035", { label: "Anodised control panel, mat and mast" });
const safetyYellow = param("safetyYellow", "#f0c12c", { label: "Safety-yellow collar and kick plate" });
const signalRed = param("signalRed", "#d3302a", { label: "Emergency stop and red lamp" });

presets({
  stationBlue: { powderCoat: "#2f5f7a", anodised: "#2b3035", safetyYellow: "#f0c12c", signalRed: "#d3302a" },
  festival: { powderCoat: "#d47452", anodised: "#333438", safetyYellow: "#f4cf45", signalRed: "#d7322b" },
  twilight: { powderCoat: "#35405f", anodised: "#1d2226", safetyYellow: "#c9a634", signalRed: "#b3282a" },
});

const GREEN = "#3fae4f";
const AMBER = "#f39c2a";
const SCREEN = "#6fc3d6";

const p = assembly("ride-operator-console");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 4 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);

const W = 860;
// Desk slope runs from the front lip (y = -360, z = 960) up to the back (y = 260, z = 1080).
const LIP: [number, number] = [-360, 960];
const BACK: [number, number] = [260, 1080];
const SLOPE = (Math.atan2(BACK[1] - LIP[1], BACK[0] - LIP[0]) * 180) / Math.PI;
const MID_Y = (LIP[0] + BACK[0]) / 2;
const MID_Z = (LIP[1] + BACK[1]) / 2;
// Place a shape built standing on z = 0 onto the desk face at (x, v along the slope).
const onDesk = (shape: Shape, x: number, v: number) => shape.translate(x, v, 14).rotateX(SLOPE).translate(0, MID_Y, MID_Z);

// Anti-fatigue mat, plinth, pedestal cabinet with the overhanging desk.
add("mat", plan(rr(900, 520, 40), 0, 16).translate(0, -720, 0).color(anodised));
add("plinth", box(W - 60, 560, 70, true).translate(0, 10, 35).color(anodised));
add("pedestal", profileYZ([[-220, 70], [260, 70], BACK, LIP, [-360, 900], [-220, 840]], W).color(powderCoat));
add("kick-plate", box(W - 40, 12, 140, true).translate(0, -226, 150).color(safetyYellow));
add("service-door", box(W - 260, 10, 520, true).translate(0, -224, 520).color(powderCoat));
add("door-handle", box(24, 30, 120, true).translate(250, -238, 560).color(anodised));
add("door-vent", box(300, 8, 60, true).translate(0, -232, 330).color(anodised));

// Control face plate on the slope.
add("control-face", onDesk(box(W - 120, 580, 14, true).translate(0, 0, -7), 0, 0).color(anodised));

// Emergency stop: yellow guard collar and red mushroom head.
add("estop-collar", onDesk(cylinder(26, 80, 20), 0, -60).color(safetyYellow));
add("estop-stem", onDesk(cylinder(60, 30, 12), 0, -60).color(signalRed));
add("estop-head", onDesk(sphere(62).scale([1, 1, 0.5]).translate(0, 0, 66), 0, -60).color(signalRed));

// Two-hand dispatch buttons, spaced apart so both hands are needed.
for (const x of [-280, 280]) {
  add(`dispatch-bezel-${x > 0 ? "r" : "l"}`, onDesk(cylinder(16, 48, 16), x, -150).color(safetyYellow));
  add(`dispatch-button-${x > 0 ? "r" : "l"}`, onDesk(cylinder(40, 34, 16), x, -150).color(GREEN));
}

// Key switch and selector knob.
add("key-switch", onDesk(cylinder(24, 30, 12), -200, 60).color(safetyYellow));
add("key", onDesk(box(12, 40, 70, true).translate(0, 0, 50), -200, 60).color(anodised));
add("selector-base", onDesk(cylinder(14, 36, 14), 200, 60).color(powderCoat));
add("selector-knob", onDesk(box(80, 24, 40, true).rotateZ(35).translate(0, 0, 30), 200, 60).color(signalRed));

// Pilot lamps along the back of the face, alternating amber and green.
for (let k = 0; k < 6; k++) {
  const x = -275 + k * 110;
  add(`pilot-ring-${k}`, onDesk(cylinder(10, 26, 12), x, 210).color(powderCoat));
  add(`pilot-lamp-${k}`, onDesk(sphere(18).scale([1, 1, 0.8]).translate(0, 0, 10), x, 210).color(k % 2 === 0 ? AMBER : GREEN));
}

// Status screen on a raised back upstand.
add("upstand", box(W - 120, 60, 250, true).translate(0, 230, 1185).color(powderCoat));
add("screen", box(420, 12, 170, true).rotateX(-10).translate(-80, 196, 1190).color(SCREEN));
add("screen-bezel", box(460, 14, 210, true).rotateX(-10).translate(-80, 202, 1190).color(anodised));

// Raised side cheeks framing the desk.
for (const sx of [-1, 1])
  add(`side-cheek-${sx > 0 ? "r" : "l"}`, profileYZ([[-380, 940], [260, 1060], [260, 1300], [-60, 1160], [-380, 1020]], 30).translate(sx * (W / 2 - 15), 0, 0).color(powderCoat));

// Stack light on a mast behind the right cheek.
const SX = W / 2 - 80;
const SY = 230;
add("mast", cylinder(320, 18, 10).translate(SX, SY, 1300).color(anodised));
const lamps = [GREEN, AMBER, signalRed];
lamps.forEach((c, k) => {
  add(`stack-lamp-${k}`, cylinder(90, 45, 16).translate(SX, SY, 1620 + k * 100).color(c));
  add(`stack-ring-${k}`, cylinder(10, 48, 16).translate(SX, SY, 1710 + k * 100).color(anodised));
});
add("stack-cap", sphere(45).scale([1, 1, 0.45]).translate(SX, SY, 1920).color(anodised));
add("stack-base", cylinder(30, 50, 16).translate(SX, SY, 1590).color(anodised));

// PA gooseneck microphone rising from the left of the desk.
const MX = -W / 2 + 110;
const MY = 180;
const MZ = 1180;
const neck = [[0, 0], [0, 140], [-30, 260], [-90, 330]];
add("mic-base", cylinder(30, 40, 14).translate(MX, MY, MZ - 20).color(anodised));
for (let k = 0; k < neck.length - 1; k++) {
  const [y0, z0] = neck[k];
  const [y1, z1] = neck[k + 1];
  const len = Math.hypot(y1 - y0, z1 - z0);
  const a = (Math.atan2(-(y1 - y0), z1 - z0) * 180) / Math.PI;
  add(`mic-neck-${k}`, cylinder(len, 9, 8).rotateX(a).translate(MX, MY + y0, MZ + z0).color(anodised));
  add(`mic-joint-${k}`, sphere(11).translate(MX, MY + y1, MZ + z1).color(anodised));
}
add("mic-head", cylinder(70, 22, 12).rotateX(60).translate(MX, MY - 90, MZ + 330).color(anodised));
add("mic-windscreen", sphere(26).translate(MX, MY - 150, MZ + 365).color(signalRed));

return p.model();
