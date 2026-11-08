// SPDX-License-Identifier: CC0-1.0
// Ride maintenance tool cart: the roll cab a ride technician pushes along the
// track walkway for the morning inspection before the park opens.
// What makes it a mechanic's roll cab rather than a cupboard: a stack of
// graded shallow drawers with full-width chrome pulls and a lock, a top chest
// with its lid propped open on gas struts showing a socket tray, a pegboard
// end panel with wrenches and a hammer hanging on it, a cordless drill and a
// grease gun on the worktop, corner bumpers, a tubular push handle, and two
// swivel and two fixed casters.
// Generic visualization geometry at about real size (about 1.3 m long with the
// handle, 0.6 m deep, 1.6 m to the open lid), millimetres, Z up, drawer face
// on -Y, standing on z = 0.
meta({
  name: "ride-maintenance-tool-cart",
  license: "CC0-1.0",
  title: "Ride maintenance tool cart",
  description: "Ride technician's roll cab at about real size: graded shallow drawers with full-width chrome pulls and a lock, a top chest with its lid propped open on gas struts over a socket tray, a pegboard end panel with hanging wrenches and a hammer, a cordless drill and grease gun on the worktop, corner bumpers, a tubular push handle and two swivel plus two fixed casters. Material controls: powder-coated cabinet, chrome, rubber, tool plastic. Workshop red, safety blue and twilight presets.",
  tags: ["tool cart", "roll cab", "tool chest", "maintenance", "workshop", "drill", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#b8322c", { label: "Powder-coated cabinet and chest" });
const chrome = param("chrome", "#c4cacc", { label: "Chrome pulls, handle and tools" });
const rubber = param("rubber", "#26292c", { label: "Rubber bumpers, mat and casters" });
const toolPlastic = param("toolPlastic", "#e8b62e", { label: "Power-tool plastic and pegboard" });

presets({
  workshopRed: { powderCoat: "#b8322c", chrome: "#c4cacc", rubber: "#26292c", toolPlastic: "#e8b62e" },
  safetyBlue: { powderCoat: "#2d5f9e", chrome: "#cfd4d6", rubber: "#24282b", toolPlastic: "#e46d2a" },
  twilight: { powderCoat: "#3b3f47", chrome: "#8e989c", rubber: "#1c1f22", toolPlastic: "#3fa36b" },
});

const p = assembly("ride-maintenance-tool-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 4 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);

const L = 1000;
const W = 560;
const FRONT = -W / 2;
const Z0 = 180;
const CAB = 1000;
const CHEST = 1260;

// Casters: swivel at -X, fixed at +X.
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) {
    const x = sx * (L / 2 - 90);
    const y = sy * (W / 2 - 90);
    const s = `${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`;
    add(`caster-plate-${s}`, box(110, 110, 12, true).translate(x, y, Z0 - 6).color(chrome));
    if (sx < 0) add(`caster-swivel-${s}`, cylinder(20, 30, 10).translate(x, y, Z0 - 32).color(chrome));
    for (const side of [-1, 1]) add(`caster-fork-${s}-${side > 0 ? "o" : "i"}`, box(8, 76, 110, true).translate(x + side * 32, y - (sx < 0 ? 18 : 0), 90).color(chrome));
    add(`caster-wheel-${s}`, cylinder(48, 64, 14).rotateY(90).translate(x - 24, y - (sx < 0 ? 18 : 0), 64).color(rubber));
  }

// Lower cabinet of graded drawers.
add("cabinet", plan(rr(L, W, 20), Z0, CAB - Z0).color(powderCoat));
add("worktop-mat", plan(rr(L + 20, W + 20, 24), CAB, 22).color(rubber));
let z = Z0 + 30;
[80, 80, 100, 120, 160, 200].forEach((h, i) => {
  add(`drawer-${i}`, box(L - 50, 14, h, true).translate(0, FRONT - 7, z + h / 2).color(powderCoat));
  add(`drawer-pull-${i}`, box(L - 120, 26, 18, true).translate(0, FRONT - 26, z + h - 18).color(chrome));
  z += h + 8;
});
add("lock", cylinder(16, 18, 12).rotateX(90).translate(L / 2 - 60, FRONT - 10, CAB - 40).color(chrome));
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) add(`corner-bumper-${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`, box(40, 40, CAB - Z0 - 40, true).translate(sx * (L / 2 - 6), sy * (W / 2 - 6), (Z0 + CAB) / 2).color(rubber));

// Top chest, offset to the back, lid propped open on gas struts.
const CW = 420;
const CY = W / 2 - CW / 2;
add("chest", plan(rr(L - 40, CW, 16), CAB + 22, CHEST - CAB - 22).subtract(plan(rr(L - 80, CW - 40, 10), CHEST - 60, 200)).translate(0, CY, 0).color(powderCoat));
add("chest-drawer", box(L - 90, 12, 70, true).translate(0, FRONT + (W - CW) - 6, CAB + 70).color(powderCoat));
add("chest-pull", box(L - 160, 22, 16, true).translate(0, FRONT + (W - CW) - 20, CAB + 92).color(chrome));
add("socket-tray", box(L - 100, CW - 60, 20, true).translate(0, CY, CHEST - 50).color(rubber));
for (let k = 0; k < 10; k++) add(`socket-${k}`, cylinder(40, 14 + k * 1.5, 10).translate(-380 + k * 80, CY - 70, CHEST - 40).color(chrome));
add("ratchet", box(260, 30, 20, true).rotateZ(-8).translate(0, CY + 60, CHEST - 30).color(chrome));
add("ratchet-head", cylinder(24, 28, 12).translate(140, CY + 40, CHEST - 40).color(chrome));
// Lid hinged on the back edge and opened about 100 degrees.
add("lid", box(L - 40, CW, 30, true).translate(0, -CW / 2, 15).rotateX(-100).translate(0, W / 2, CHEST).color(powderCoat));
add("lid-badge", box(300, 8, 70, true).rotateX(-10).translate(0, W / 2 + 40, CHEST + 260).color(toolPlastic));
for (const sx of [-1, 1]) add(`gas-strut-${sx > 0 ? "r" : "l"}`, cylinder(300, 9, 8).rotateX(-50).translate(sx * (L / 2 - 50), W / 2 - 200, CHEST - 60).color(chrome));

// Pegboard end panel on -X with hanging wrenches and a hammer.
const PX = -L / 2 - 14;
add("pegboard", box(12, W - 60, 620, true).translate(PX, 0, 620).color(toolPlastic));
for (let r = 0; r < 4; r++) add(`peg-rail-${r}`, box(8, W - 100, 8, true).translate(PX - 10, 0, 400 + r * 140).color(rubber));
for (let k = 0; k < 4; k++) {
  const y = -170 + k * 80;
  const len = 200 + k * 30;
  add(`wrench-shank-${k}`, box(8, 22, len, true).translate(PX - 18, y, 840 - len / 2).color(chrome));
  add(`wrench-ring-${k}`, torus(18, 7, 10).rotateY(90).translate(PX - 18, y, 840 - len - 10).color(chrome));
  add(`wrench-jaw-${k}`, box(8, 46, 30, true).translate(PX - 18, y, 850).color(chrome));
}
add("hammer-handle", cylinder(320, 14, 8).translate(PX - 20, 170, 460).color(rubber));
add("hammer-head", box(34, 130, 40, true).translate(PX - 20, 170, 800).color(chrome));

// Cordless drill and grease gun on the worktop in front of the chest.
const DX = -260;
const DY = FRONT + 70;
add("drill-battery", box(80, 110, 50, true).translate(DX, DY, CAB + 47).color(rubber));
add("drill-grip", box(50, 60, 160, true).rotateX(-12).translate(DX, DY + 10, CAB + 150).color(toolPlastic));
add("drill-body", cylinder(200, 40, 12).rotateY(90).translate(DX - 80, DY + 20, CAB + 250).color(toolPlastic));
add("drill-chuck", cylinder(60, 22, 10).rotateY(-90).translate(DX - 80, DY + 20, CAB + 250).color(chrome));
add("drill-bit", cylinder(80, 5, 6).rotateY(-90).translate(DX - 140, DY + 20, CAB + 250).color(chrome));
add("grease-barrel", cylinder(340, 30, 12).rotateY(90).translate(60, DY + 10, CAB + 52).color(powderCoat));
add("grease-head", box(60, 70, 70, true).translate(430, DY + 10, CAB + 57).color(chrome));
add("grease-lever", box(200, 16, 16, true).rotateY(-10).translate(320, DY + 10, CAB + 110).color(chrome));
add("grease-hose", cylinder(130, 8, 6).rotateY(90).translate(460, DY + 10, CAB + 70).color(rubber));

// Tubular push handle on the +X end.
for (const sy of [-1, 1]) add(`handle-arm-${sy > 0 ? "b" : "f"}`, box(150, 24, 24, true).translate(L / 2 + 75, sy * (W / 2 - 80), CAB - 108).color(chrome));
add("handle-bar", cylinder(W - 120, 20, 12).rotateX(90).translate(L / 2 + 150, W / 2 - 60, CAB - 108).color(chrome));
add("handle-grip", cylinder(W - 280, 26, 12).rotateX(90).translate(L / 2 + 150, W / 2 - 140, CAB - 108).color(rubber));

return p.model();
