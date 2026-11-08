// SPDX-License-Identifier: CC0-1.0
// Park operations radio rack: the back-of-house charging station where ride
// operators pick up and return their two-way radios at shift change.
// What makes it a radio charging rack rather than a cabinet: a powder-coated
// frame on splayed feet with a perforated backplate, a sloped desk of six
// charging pockets, each holding a handheld radio (rounded body, stubby antenna,
// channel knob, display and green or amber charge lamp), an overhead status bar
// with lamps, a cable tray with drooping charger leads below, a sign-out
// clipboard and a spare-battery shelf.
// Generic visualization geometry at about real size (about 1.6 m wide, 1.9 m
// tall), millimetres, Z up, facing -Y, standing on z = 0.
meta({
  name: "park-operations-radio-rack",
  license: "CC0-1.0",
  title: "Park operations radio rack",
  description: "Back-of-house two-way radio charging rack at about real size: powder-coated frame on splayed feet, perforated backplate, sloped desk of six charging pockets each holding a handheld radio with antenna, channel knob, display and charge lamp, overhead status bar, cable tray with drooping charger leads, sign-out clipboard and spare-battery shelf. Material controls: powder-coated frame, stainless trim, radio polymer and acrylic lamps. Operations, festival and night-shift presets.",
  tags: ["radio", "walkie talkie", "charging station", "two-way radio", "back of house", "operations", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 5500,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated frame" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless trim and tray" });
const polymer = param("polymer", "#24272c", { label: "Radio and lead polymer" });
const acrylic = param("acrylic", "#5fd06a", { label: "Acrylic charge lamps" });

presets({
  operations: { powderCoat: "#477985", stainlessSteel: "#b0b9b6", polymer: "#24272c", acrylic: "#5fd06a" },
  festival: { powderCoat: "#d47452", stainlessSteel: "#c2c9c5", polymer: "#2e2a35", acrylic: "#f2c84b" },
  nightShift: { powderCoat: "#2c3e4f", stainlessSteel: "#7f8b90", polymer: "#15181c", acrylic: "#59c2e8" },
});

const p = assembly("park-operations-radio-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1520;
const BACK_Y = 260;

// Frame: two side uprights on splayed feet, perforated backplate.
for (const sx of [-1, 1]) {
  const s = sx > 0 ? "r" : "l";
  add(`upright-${s}`, box(70, 70, 1840, true).translate(sx * (W / 2 + 35), BACK_Y, 960).color(powderCoat));
  add(`foot-${s}`, profileYZ([[-380, 0], [280, 0], [160, 50], [-300, 50], [-380, 30]], 90).translate(sx * (W / 2 + 35), BACK_Y - 60, 0).color(powderCoat));
  add(`leveller-${s}`, cylinder(20, 40, 10).translate(sx * (W / 2 + 35), BACK_Y - 400, 0).color(polymer));
}
add("backplate", box(W, 30, 1500, true).translate(0, BACK_Y, 1050).color(powderCoat));
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 8; c++) {
    add(`perforation-${r}-${c}`, box(60, 6, 60, true).translate(-560 + c * 160, BACK_Y - 18, 1180 + r * 90).color(polymer));
  }
}

// Sloped charging desk: six pockets, each with a radio standing in it.
const SLOPE = 15;
const DESK_Z = 700;
add("desk", profileYZ([[-150, 0], [BACK_Y, 0], [BACK_Y, 200], [-150, 90]], W).translate(0, 0, DESK_Z - 120).color(stainlessSteel));
add("desk-shelf", box(W, BACK_Y + 150, 30, true).translate(0, (BACK_Y - 150) / 2, DESK_Z - 135).color(powderCoat));
const N = 6;
for (let k = 0; k < N; k++) {
  const x = -W / 2 + (W / N) * (k + 0.5);
  const lampOn = k !== 2 && k !== 4;
  // Charger pocket on the desk.
  add(`charger-${k}`, extrudeRoundedRect(200, 110, 20, 180, { axis: "y" }).translate(x, -20, DESK_Z + 20).color(polymer));
  add(`charger-lamp-${k}`, box(60, 10, 22, true).translate(x, -26, DESK_Z + 35).color(lampOn ? acrylic : stainlessSteel));
  if (k === 3) continue;
  // Handheld radio standing in the pocket, tipped back slightly.
  const radio = (shape: Shape) => shape.rotateX(-SLOPE).translate(x, 80, DESK_Z + 60);
  add(`radio-${k}`, radio(extrudeRoundedRect(110, 300, 22, 50, { axis: "y" }).translate(0, -25, 150)).color(polymer));
  add(`radio-display-${k}`, radio(box(70, 6, 50, true).translate(0, -28, 220)).color(acrylic));
  add(`radio-grille-${k}`, radio(box(80, 6, 90, true).translate(0, -28, 100)).color(stainlessSteel));
  add(`radio-antenna-${k}`, radio(cylinder(170, 12, 8).translate(-30, 0, 300)).color(polymer));
  add(`radio-knob-${k}`, radio(cylinder(30, 16, 10).translate(25, 0, 300)).color(k % 2 === 0 ? acrylic : stainlessSteel));
}

// Overhead status bar with lamps.
add("status-bar", extrudeRoundedRect(W, 160, 30, 120, { axis: "y" }).translate(0, BACK_Y - 140, 1720).color(stainlessSteel));
for (let k = 0; k < N; k++) {
  const x = -W / 2 + (W / N) * (k + 0.5);
  add(`status-lamp-${k}`, cylinder(30, 34, 12).rotateX(90).translate(x, BACK_Y - 140, 1720).color(k === 3 ? powderCoat : acrylic));
}

// Cable tray with drooping charger leads, and a spare-battery shelf.
add("cable-tray", profileYZ([[-120, 0], [120, 0], [120, 80], [100, 80], [100, 20], [-100, 20], [-100, 80], [-120, 80]], W).translate(0, BACK_Y - 140, 380).color(stainlessSteel));
for (let k = 0; k < N; k++) {
  const x = -W / 2 + (W / N) * (k + 0.5);
  add(`lead-loop-${k}`, torus(90, 10, 12).rotateY(90).translate(x + 40, BACK_Y - 140, 460 + 90 * 0.2).subtract(box(60, 400, 400, true).translate(x + 40, BACK_Y - 140, 680)).color(polymer));
}
add("battery-shelf", box(W - 100, 260, 24, true).translate(0, BACK_Y - 150, 180).color(powderCoat));
for (let k = 0; k < 8; k++) add(`spare-battery-${k}`, extrudeRoundedRect(70, 120, 12, 40, { axis: "y" }).translate(-560 + k * 160, BACK_Y - 200, 252).color(k % 3 === 0 ? acrylic : polymer));

// Sign-out clipboard hung on the left upright.
add("clipboard", box(240, 12, 330, true).rotateZ(-8).translate(-W / 2 - 160, BACK_Y - 60, 1250).color(stainlessSteel));
add("clipboard-sheet", box(210, 6, 270, true).rotateZ(-8).translate(-W / 2 - 160, BACK_Y - 70, 1235).color(acrylic));
add("clipboard-clip", box(90, 20, 30, true).rotateZ(-8).translate(-W / 2 - 155, BACK_Y - 72, 1405).color(polymer));
add("clipboard-hook", cylinder(80, 10, 8).rotateY(90).translate(-W / 2 - 100, BACK_Y - 40, 1420).color(stainlessSteel));

return p.model();
