// SPDX-License-Identifier: CC0-1.0
// Churro warmer cart: the narrow midway snack cart that keeps fried churros
// warm and sells them by the stick.
// What makes it a churro cart rather than a generic barrow: churros with the
// ridged star cross-section of piped dough, standing in a holder rack and
// lying in a heated tray; a cinnamon-sugar dusting station with a shaker; an
// enamel cabinet with a crossed-churro emblem on a pastry band; two big
// spoked bicycle wheels with a push handle; and a square peaked canopy with
// scalloped valances in carnival stripes.
// Generic visualization geometry at about real size (about 1.9 m long with
// the handle, 1.4 m wide under the canopy, 2.4 m to the canopy peak),
// millimetres, Z up, guest face on -Y, standing on z = 0.
meta({
  name: "churro-warmer-cart",
  license: "CC0-1.0",
  title: "Churro warmer cart",
  description: "Midway churro warmer cart at about real size: star-ridged churros standing in a holder rack and lying in a heated tray, a cinnamon-sugar dusting station with shaker, an enamel cabinet with a crossed-churro emblem on a pastry band, two spoked bicycle wheels, stand legs and a push handle, and a square peaked canopy with scalloped valances in carnival stripes. Material controls: baked enamel, stainless steel, golden pastry, rubber tyres. Festival, twilight and fiesta presets.",
  tags: ["churro cart", "churros", "snack cart", "food warmer", "concession", "canopy", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel cabinet and canopy stripe" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless tray, rack and frame" });
const pastry = param("pastry", "#d99a3c", { label: "Churros, band and canopy stripe" });
const rubber = param("rubber", "#292f33", { label: "Rubber tyres and grips" });

presets({
  festival: { enamel: "#3f9bd8", stainlessSteel: "#d1d1c6", pastry: "#e3a745", rubber: "#3c4245" },
  twilight: { enamel: "#4a3f78", stainlessSteel: "#788b91", pastry: "#c98d3a", rubber: "#20262a" },
  fiesta: { enamel: "#2f9b6a", stainlessSteel: "#c3cbc8", pastry: "#e0a246", rubber: "#2b2f33" },
});

const p = assembly("churro-warmer-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Six-point star: the ridged cross-section of a piped churro.
const STAR = [];
for (let k = 0; k < 12; k++) {
  const a = (k * Math.PI) / 6;
  const r = k % 2 === 0 ? 24 : 15;
  STAR.push([r * Math.cos(a), r * Math.sin(a)]);
}
// A churro of length len, along +Z from the origin.
const churro = (len: number) => extrudePolygon(STAR, len);

const L = 1400;
const Wd = 640;
const FRONT = -Wd / 2;
const Z0 = 420;
const TOP = 980;

// Cabinet, pastry band with crossed-churro emblem, and stainless top.
add("cabinet", plan(rr(L, Wd, 90), Z0, TOP - Z0).color(enamel));
add("cabinet-skirt", plan(rr(L + 20, Wd + 20, 95), Z0, 40).color(stainlessSteel));
add("band", plan(rr(L + 16, Wd + 16, 95), 760, 130).color(pastry));
add("emblem-disc", cylinder(12, 120, 24).rotateX(90).translate(250, FRONT - 6, 825).color(enamel));
for (const [k, a] of [-40, 40].entries()) add(`emblem-churro-${k}`, churro(200).translate(0, 0, -100).rotateY(a).scale([1, 0.4, 1]).translate(250, FRONT - 24, 825).color(pastry));
add("top-tray", plan(rr(L + 40, Wd + 40, 100), TOP, 40).color(stainlessSteel));

// Heated tray of churros lying side by side, with a low guard rail.
const TX = 230;
add("heated-tray", box(620, 360, 50, true).translate(TX, -60, TOP + 65).color(stainlessSteel));
for (let k = 0; k < 7; k++) add(`tray-churro-${k}`, churro(540).rotateY(90).translate(TX - 270, -200 + k * 46, TOP + 115).color(pastry));
for (const x of [TX - 320, TX + 320]) add(`guard-post-${x < TX ? "l" : "r"}`, cylinder(200, 12, 8).translate(x, -260, TOP + 40).color(stainlessSteel));
add("guard-rail", cylinder(640, 12, 8).rotateY(90).translate(TX - 320, -260, TOP + 240).color(stainlessSteel));

// Holder rack of upright churros at the -X end.
const RX = -370;
add("holder-rack", plan(rr(380, 220, 40), TOP + 40, 150).translate(RX, -100, 0).color(stainlessSteel));
for (let r = 0; r < 2; r++)
  for (let c = 0; c < 4; c++) {
    const lean = (c - 1.5) * 6;
    add(`upright-churro-${r}-${c}`, churro(330).rotateX(r === 0 ? -6 : 6).rotateY(lean).translate(RX - 130 + c * 87, -150 + r * 100, TOP + 80).color(pastry));
  }

// Cinnamon-sugar dusting station on the +X end, with a shaker.
add("dusting-pan", box(260, 300, 60, true).translate(620, 60, TOP + 70).color(stainlessSteel));
add("dusting-sugar", box(230, 270, 10, true).translate(620, 60, TOP + 100).color(pastry));
add("shaker", cylinder(170, 40, 12).translate(620, -170, TOP + 40).color(stainlessSteel));
add("shaker-cap", sphere(42).scale([1, 1, 0.6]).translate(620, -170, TOP + 210).color(enamel));

// Two big spoked bicycle wheels at -X, stand legs and push handle at +X.
const WX = -380;
const WR = 340;
for (const sy of [-1, 1]) {
  const y = sy * (Wd / 2 + 70);
  const s = sy > 0 ? "b" : "f";
  add(`tyre-${s}`, torus(WR - 26, 26, 28).rotateX(90).translate(WX, y, WR).color(rubber));
  add(`rim-${s}`, torus(WR - 56, 10, 28).rotateX(90).translate(WX, y, WR).color(stainlessSteel));
  add(`hub-${s}`, cylinder(70, 45, 14).rotateX(90).translate(WX, y + 35, WR).color(enamel));
  for (let k = 0; k < 8; k++) add(`spoke-${s}-${k}`, box(2 * (WR - 60), 8, 8, true).rotateY(k * 22.5).translate(WX, y, WR).color(stainlessSteel));
}
add("axle", cylinder(Wd + 140, 18, 10).rotateX(90).translate(WX, Wd / 2 + 70, WR).color(stainlessSteel));
for (const sy of [-1, 1]) {
  const s = sy > 0 ? "b" : "f";
  add(`stand-leg-${s}`, cylinder(Z0 - 20, 20, 10).translate(L / 2 - 120, sy * (Wd / 2 - 70), 20).color(stainlessSteel));
  add(`stand-foot-${s}`, cylinder(20, 38, 12).translate(L / 2 - 120, sy * (Wd / 2 - 70), 0).color(rubber));
  add(`handle-arm-${s}`, cylinder(340, 18, 10).rotateY(72).translate(L / 2 - 20, sy * (Wd / 2 - 60), 880).color(stainlessSteel));
}
add("handle-bar", cylinder(Wd - 60, 22, 12).rotateX(90).translate(L / 2 + 300, Wd / 2 - 30, 985).color(stainlessSteel));
add("handle-grip", cylinder(Wd - 260, 28, 12).rotateX(90).translate(L / 2 + 300, Wd / 2 - 130, 985).color(rubber));

// Square peaked canopy on a centre pole: four striped panels and valances.
const PX = -60;
const PY = 120;
const HALF = 680;
const RISE = 330;
const EAVE = 2050;
const slant = Math.sqrt(HALF * HALF + RISE * RISE);
const tilt = (Math.atan2(HALF, RISE) * 180) / Math.PI;
add("canopy-pole", cylinder(EAVE + RISE - TOP - 40, 20, 10).translate(PX, PY, TOP + 40).color(stainlessSteel));
const scallops = [[-HALF, 0], [HALF, 0]];
for (let i = 4; i >= 0; i--) {
  const xc = -HALF + 136 + 272 * i;
  for (let k = 1; k < 6; k++) scallops.push([xc + 136 * Math.cos((k * Math.PI) / 6), -95 * Math.sin((k * Math.PI) / 6)]);
  if (i > 0) scallops.push([xc - 136, 0]);
}
for (let k = 0; k < 4; k++) {
  const panel = face([[-HALF, 0], [HALF, 0], [0, slant]], 16, -8).rotateX(-tilt).translate(0, -HALF, 0);
  const valance = face([...scallops].reverse(), 10, -HALF - 10);
  add(`canopy-panel-${k}`, panel.rotateZ(k * 90).translate(PX, PY, EAVE).color(k % 2 === 0 ? enamel : pastry));
  add(`canopy-valance-${k}`, valance.rotateZ(k * 90).translate(PX, PY, EAVE).color(k % 2 === 0 ? pastry : enamel));
}
add("canopy-finial", sphere(40).translate(PX, PY, EAVE + RISE + 20).color(pastry));

return p.model();
