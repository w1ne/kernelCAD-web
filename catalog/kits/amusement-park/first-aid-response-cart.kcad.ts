// SPDX-License-Identifier: CC0-1.0
// First aid response cart: the emergency "crash cart" that park medics wheel
// from the first-aid post to a guest who has been taken ill in a queue.
// What makes it a response cart rather than a tool chest: a powder-coated
// cabinet of graded supply drawers with full-width pulls, a breakaway seal bar
// locking them shut, a rubber bumper ring, a white panel with the red first-aid
// cross on the side, a lipped top tray carrying a trauma bag and a
// defibrillator case, an oxygen cylinder in a side cradle, an IV pole with
// hooks, a push handle and four swivel casters.
// Generic visualization geometry at about real size (about 1.2 m long with the
// handle, 0.7 m deep, 1.9 m to the IV hooks), millimetres, Z up, drawer face on
// -Y, standing on z = 0.
meta({
  name: "first-aid-response-cart",
  license: "CC0-1.0",
  title: "First aid response cart",
  description: "Park first-aid response cart at about real size: powder-coated cabinet of graded supply drawers with full-width pulls, a breakaway seal bar, a rubber bumper ring, a side panel with the first-aid cross, a lipped top tray carrying a trauma bag and defibrillator case, an oxygen cylinder in a side cradle, an IV pole with hooks, a push handle and four swivel casters. Material controls: powder-coated cabinet, ABS drawer fronts and panels, stainless steel, rubber. Classic red, paramedic green and twilight presets.",
  tags: ["first aid cart", "crash cart", "medical cart", "emergency", "defibrillator", "oxygen cylinder", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#c3342d", { label: "Powder-coated cabinet, cross and trauma bag" });
const abs = param("abs", "#eeefea", { label: "ABS drawer fronts, tray and cross panel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless pulls, frame and cylinder" });
const rubber = param("rubber", "#292f33", { label: "Rubber bumper and caster wheels" });

presets({
  classicRed: { powderCoat: "#c3342d", abs: "#eeefea", stainlessSteel: "#b0b9b6", rubber: "#292f33" },
  paramedicGreen: { powderCoat: "#2f8a55", abs: "#f1f2ec", stainlessSteel: "#c1c8c4", rubber: "#2b3034" },
  twilight: { powderCoat: "#8e2a2f", abs: "#c9cfd2", stainlessSteel: "#788b91", rubber: "#20262a" },
});

const p = assembly("first-aid-response-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 5 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);

const L = 880;
const W = 560;
const FRONT = -W / 2;
const Z0 = 170;
const TOP = 900;

// Four swivel casters: top plate, fork and wheel.
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) {
    const x = sx * (L / 2 - 90);
    const y = sy * (W / 2 - 90);
    const s = `${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`;
    add(`caster-plate-${s}`, box(100, 100, 12, true).translate(x, y, Z0 - 6).color(stainlessSteel));
    add(`caster-swivel-${s}`, cylinder(20, 28, 10).translate(x, y, Z0 - 32).color(stainlessSteel));
    for (const side of [-1, 1]) add(`caster-fork-${s}-${side > 0 ? "o" : "i"}`, box(8, 70, 110, true).translate(x + side * 30, y - 15, 85).color(stainlessSteel));
    add(`caster-wheel-${s}`, cylinder(44, 60, 14).rotateY(90).translate(x - 22, y - 25, 60).color(rubber));
  }

// Cabinet, rubber bumper ring and lipped top tray.
add("cabinet", plan(rr(L, W, 50), Z0, TOP - Z0).color(powderCoat));
add("bumper", plan(rr(L + 50, W + 50, 70), Z0 + 15, 45).color(rubber));
const trayOuter = plan(rr(L + 70, W + 70, 70), TOP, 55);
add("top-tray", trayOuter.subtract(plan(rr(L + 20, W + 20, 50), TOP + 15, 60)).color(abs));

// Graded supply drawers with full-width pulls on stand-offs.
let z = Z0 + 80;
[110, 110, 150, 210].forEach((h, i) => {
  add(`drawer-${i}`, box(L - 60, 16, h, true).translate(0, FRONT - 8, z + h / 2).color(abs));
  add(`drawer-label-${i}`, box(110, 4, 32, true).translate(-L / 2 + 120, FRONT - 18, z + h / 2).color(powderCoat));
  add(`drawer-pull-${i}`, cylinder(L - 300, 11, 8).rotateY(90).translate(-(L - 300) / 2 + 40, FRONT - 40, z + h - 32).color(stainlessSteel));
  for (const x of [-(L - 300) / 2 + 60, (L - 300) / 2 + 20]) add(`drawer-standoff-${i}-${x > 0 ? "r" : "l"}`, box(16, 32, 16, true).translate(x, FRONT - 22, z + h - 32).color(stainlessSteel));
  z += h + 12;
});

// Breakaway seal bar locking the drawers, with a seal tag.
add("seal-bar", box(26, 26, 680, true).translate(L / 2 - 20, FRONT - 26, Z0 + 410).color(stainlessSteel));
add("seal-hasp", box(40, 30, 40, true).translate(L / 2 - 20, FRONT - 30, TOP - 40).color(stainlessSteel));
add("seal-tag", box(50, 4, 70, true).rotateY(12).translate(L / 2 - 30, FRONT - 46, TOP - 110).color(powderCoat));

// White panel with the first-aid cross on the -X side.
add("cross-panel", box(8, 380, 380, true).translate(-L / 2 - 4, 0, 560).color(abs));
add("cross-vertical", box(8, 100, 300, true).translate(-L / 2 - 10, 0, 560).color(powderCoat));
add("cross-horizontal", box(8, 300, 100, true).translate(-L / 2 - 10, 0, 560).color(powderCoat));

// Oxygen cylinder in a side cradle on the -X end, behind the cross.
const OX = -L / 2 - 85;
const OY = W / 2 - 60;
add("o2-cylinder", cylinder(560, 62, 16).translate(OX, OY, 300).color(stainlessSteel));
add("o2-shoulder", sphere(62).scale([1, 1, 0.55]).translate(OX, OY, 860).color(abs));
add("o2-valve", cylinder(70, 22, 10).translate(OX, OY, 880).color(stainlessSteel));
add("o2-regulator", cylinder(30, 34, 12).rotateY(90).translate(OX - 15, OY, 935).color(abs));
add("o2-gauge", cylinder(16, 26, 12).rotateX(90).translate(OX, OY - 30, 980).color(powderCoat));
for (const [k, zc] of [400, 760].entries()) {
  add(`cradle-ring-${k}`, torus(66, 9, 18).translate(OX, OY, zc).color(rubber));
  add(`cradle-arm-${k}`, box(60, 20, 20, true).translate(-L / 2 - 30, OY, zc).color(stainlessSteel));
}
add("cradle-cup", cylinder(40, 70, 16).translate(OX, OY, 270).color(rubber));

// Trauma bag and defibrillator case on the top tray.
add("trauma-bag", plan(rr(440, 280, 60), TOP + 15, 220).translate(-170, -40, 0).color(powderCoat));
add("bag-cross-v", box(50, 6, 140, true).translate(-170, -183, TOP + 125).color(abs));
add("bag-cross-h", box(140, 6, 50, true).translate(-170, -183, TOP + 125).color(abs));
add("bag-zip", box(400, 260, 10, true).translate(-170, -40, TOP + 238).color(rubber));
for (const x of [-260, -80]) add(`bag-handle-${x}`, torus(60, 10, 12).rotateX(90).translate(x, -40, TOP + 250).color(rubber));
add("aed-case", plan(rr(300, 220, 40), TOP + 15, 260).translate(230, 20, 0).color(abs));
add("aed-band", box(306, 226, 50, true).translate(230, 20, TOP + 120).color(powderCoat));
add("aed-heart", cylinder(6, 45, 12).rotateX(90).translate(230, -91, TOP + 200).color(powderCoat));
add("aed-handle", box(160, 34, 40, true).translate(230, 20, TOP + 295).color(rubber));

// Push handle on the +X end.
for (const sy of [-1, 1]) {
  add(`handle-post-${sy > 0 ? "b" : "f"}`, cylinder(240, 15, 10).translate(L / 2 + 30, sy * (W / 2 - 80), TOP - 100).color(stainlessSteel));
  add(`handle-bracket-${sy > 0 ? "b" : "f"}`, box(70, 30, 30, true).translate(L / 2 + 10, sy * (W / 2 - 80), TOP - 90).color(stainlessSteel));
}
add("handle-bar", cylinder(W - 100, 18, 12).rotateX(90).translate(L / 2 + 30, W / 2 - 50, TOP + 140).color(stainlessSteel));
add("handle-grip", cylinder(W - 260, 24, 12).rotateX(90).translate(L / 2 + 30, W / 2 - 130, TOP + 140).color(rubber));

// IV pole at the back -X corner with a four-hook crown.
const PX = -L / 2 + 70;
const PY = W / 2 + 25;
add("iv-clamp", box(60, 40, 80, true).translate(PX, PY - 10, TOP - 60).color(stainlessSteel));
add("iv-pole", cylinder(1040, 12, 10).translate(PX, PY, TOP - 120).color(stainlessSteel));
for (let k = 0; k < 4; k++) {
  const a = 45 + k * 90;
  add(`iv-hook-${k}`, cylinder(110, 6, 6).rotateY(80).rotateZ(a).translate(PX, PY, 1880).color(stainlessSteel));
  add(`iv-hook-tip-${k}`, sphere(10).translate(PX + 108 * Math.cos((a * Math.PI) / 180), PY + 108 * Math.sin((a * Math.PI) / 180), 1900).color(stainlessSteel));
}
add("iv-bag", plan(rr(90, 30, 12), 1650, 180).translate(PX + 76, PY - 76, 0).color(abs));

return p.model();
