// SPDX-License-Identifier: CC0-1.0
// Funnel cake kiosk: the fair-food fry stand where batter is poured through
// a funnel into hot oil and served dusted on a plate.
// What makes it a funnel cake kiosk rather than a generic food counter: a
// deep fryer with an oil vat and basket handles under a sloped stainless
// vent hood and duct; a batter pitcher shaped like a funnel on the counter;
// plated, lattice-ringed funnel cakes on a front pick-up ledge; an enamel
// counter with a funnel-cake emblem; and an arched header sign.
// Generic visualization geometry at about real size (about 1.9 m wide,
// 1.4 m deep with the ledge, 2.5 m to the sign top), millimetres, Z up,
// guest face on -Y, standing on z = 0.
meta({
  name: "funnel-cake-kiosk",
  license: "CC0-1.0",
  title: "Funnel cake kiosk",
  description: "Fair-food funnel cake fry stand at about real size: deep fryer with oil vat and basket handles under a sloped vent hood and duct, a funnel batter pitcher, plated funnel cakes on a front pick-up ledge with brackets, a side shelf with sugar shakers, an enamel counter with a funnel-cake emblem and an arched header sign. Material controls: baked enamel counter, stainless steel, powder-coated frame and sign, golden pastry and oil. Festival, twilight and classic presets.",
  tags: ["funnel cake", "fryer", "fry stand", "food kiosk", "concession", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 7500,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel counter" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel fryer, hood and plates" });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated frame, back panel and sign" });
const pastry = param("pastry", "#dba44f", { label: "Golden pastry and fryer oil" });

presets({
  festival: { enamel: "#edb34d", stainlessSteel: "#d1d1c6", powderCoat: "#d47452", pastry: "#c98634" },
  twilight: { enamel: "#385b81", stainlessSteel: "#788b91", powderCoat: "#35576f", pastry: "#d9a650" },
  classic: { enamel: "#b8322e", stainlessSteel: "#c3cbc8", powderCoat: "#f1e7d0", pastry: "#e0ab55" },
});

const p = assembly("funnel-cake-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t thick along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// A funnel cake: three nested rings of piped batter with a cross strand.
const funnelCake = (prefix: string, x: number, y: number, z: number, tiltDeg = 0) => {
  [95, 62, 30].forEach((r, i) => add(`${prefix}-ring-${i}`, torus(r, 16, 12).translate(0, 0, 16 + i * 6).rotateX(tiltDeg).translate(x, y, z).color(pastry)));
  add(`${prefix}-strand`, box(200, 26, 22, true).rotateZ(35).translate(0, 0, 30).rotateX(tiltDeg).translate(x, y, z).color(pastry));
};

const W = 1760;
const D = 1060;
const FRONT = -D / 2;
const TOP = 960;

// Plinth, enamel counter body with stainless trim strips and the emblem.
add("plinth", plan(rr(W - 60, D - 60, 50), 0, 90).color(powderCoat));
add("counter-body", plan(rr(W, D, 80), 90, 830).color(enamel));
for (const x of [-560, 560]) add(`trim-strip-${x < 0 ? "l" : "r"}`, face([[x - 30, 150], [x + 30, 150], [x + 30, 860], [x - 30, 860]], 12, FRONT - 12).color(stainlessSteel));
add("emblem-disc", cylinder(14, 230, 28).rotateX(90).translate(0, FRONT, 500).color(powderCoat));
funnelCake("emblem-cake", 0, FRONT - 30, 500, 90);
add("countertop", plan(rr(W + 80, D + 60, 90), 920, 40).color(stainlessSteel));

// Front pick-up ledge on three brackets, with plated funnel cakes.
add("pickup-ledge", box(1500, 280, 30, true).translate(0, FRONT - 140, 885).color(stainlessSteel));
for (const x of [-650, 0, 650]) add(`ledge-bracket-${x}`, profileYZ([[FRONT, 870], [FRONT - 250, 870], [FRONT, 640]], 24).translate(x, 0, 0).color(powderCoat));
[-480, 480].forEach((x, i) => {
  add(`plate-${i}`, turned([[0, 0], [120, 0], [150, 18], [140, 22], [0, 10]]).translate(x, FRONT - 150, 900).color(stainlessSteel));
  funnelCake(`plated-cake-${i}`, x, FRONT - 150, 905);
});

// Deep fryer on the left: casing, control knobs, oil vat and two baskets.
const FX = -430;
add("fryer-casing", plan(rr(620, 600, 40), TOP, 300).translate(FX, 0, 0).color(stainlessSteel));
add("fryer-oil", plan(rr(520, 480, 30), TOP + 296, 10).translate(FX, 0, 0).color(pastry));
for (const [k, x] of [-150, 0, 150].entries()) add(`fryer-knob-${k}`, cylinder(30, 26, 12).rotateX(90).translate(FX + x, -300, TOP + 150).color(powderCoat));
for (const [k, x] of [-120, 120].entries()) {
  add(`basket-${k}`, box(200, 300, 40, true).translate(FX + x, 20, TOP + 286).color(stainlessSteel));
  add(`basket-handle-${k}`, cylinder(300, 14, 8).rotateX(70).translate(FX + x, -130, TOP + 300).color(stainlessSteel));
  add(`basket-grip-${k}`, cylinder(120, 22, 10).rotateX(70).translate(FX + x, -355, TOP + 382).color(powderCoat));
}
funnelCake("frying-cake", FX + 120, 20, TOP + 300, 0);

// Batter pitcher shaped like a funnel, centre of the counter.
add("batter-funnel", turned([[0, 0], [24, 0], [130, 200], [130, 280], [118, 280], [0, 100]]).translate(-30, -200, TOP).color(stainlessSteel));
add("batter-funnel-handle", torus(70, 14, 16).rotateX(90).translate(110, -200, TOP + 180).color(powderCoat));

// Serving side on the right: napkin box and a stack of plates.
add("napkin-box", box(260, 160, 160, true).translate(300, -260, TOP + 80).color(powderCoat));
add("plate-stack", cylinder(90, 140, 20).translate(560, -200, TOP).color(stainlessSteel));

// Side shelf on the right flank with sugar shakers.
add("side-shelf", box(260, 700, 30, true).translate(W / 2 + 130, 0, 860).color(stainlessSteel));
for (const y of [-250, 250]) add(`side-bracket-${y < 0 ? "f" : "b"}`, face([[W / 2, 845], [W / 2 + 240, 845], [W / 2, 640]], 24, y - 12).color(powderCoat));
for (const [k, y] of [-150, 0, 150].entries()) {
  add(`shaker-${k}`, turned([[0, 0], [45, 0], [45, 140], [30, 180], [0, 190]]).translate(W / 2 + 130, y, 875).color(stainlessSteel));
  add(`shaker-cap-${k}`, cylinder(30, 47, 12).translate(W / 2 + 130, y, 875 + 120).color(powderCoat));
}

// Back panel, sloped vent hood over the fryer with its duct, and arched sign.
const BY = D / 2 - 40;
add("back-panel", box(W, 40, 1160, true).translate(0, BY, TOP + 580).color(powderCoat));
add("vent-hood", profileYZ([[BY - 20, 1740], [-260, 1810], [-260, 1880], [BY - 20, 2080]], 780).translate(FX, 0, 0).color(stainlessSteel));
add("hood-lip", profileYZ([[-250, 1800], [-290, 1800], [-290, 1890], [-250, 1890]], 800).translate(FX, 0, 0).color(powderCoat));
add("vent-duct", cylinder(420, 120, 16).translate(FX, BY - 220, 1950).color(stainlessSteel));
add("duct-cap", turned([[0, 0], [190, 0], [0, 90]]).translate(FX, BY - 220, 2380).color(powderCoat));
const arch = [[-640, 0], [640, 0]];
for (let k = 0; k <= 12; k++) {
  const a = (k / 12) * Math.PI;
  arch.push([640 * Math.cos(a), 240 + 160 * Math.sin(a)]);
}
add("header-sign", face(arch.map(([x, z]) => [x + 260, z + TOP + 1160]), 40, BY - 60).color(enamel));
add("sign-panel", cylinder(12, 190, 28).rotateX(90).translate(260, BY - 60, TOP + 1160 + 230).color(powderCoat));
funnelCake("sign-cake", 260, BY - 90, TOP + 1160 + 230, 90);

return p.model();
