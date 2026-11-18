// SPDX-License-Identifier: CC0-1.0
// Accessible entry queue gate: the wide, step-free gateway into a ride queue
// for guests using wheelchairs, scooters or strollers.
// What makes it an accessible gate rather than a turnstile: a clear opening
// of about a metre between two tall tube posts, a framed swing leaf with
// round infill bars standing open into the queue, paired handrails at adult
// and child height leading up to it, a low tapered rubber threshold ramp
// instead of a step, a push-button operator bollard on the approach, and a
// header beam carrying a blue access sign with a wheelchair symbol.
// Generic visualization geometry at about real size (about 1.6 m wide,
// 2.3 m long, 2.85 m to the sign), millimetres, Z up, approach from -Y,
// standing on z = 0.
meta({
  name: "accessible-entry-queue-gate",
  license: "CC0-1.0",
  title: "Accessible entry queue gate",
  description: "Step-free accessible queue entrance at about real size: two tall powder-coated tube posts with ball caps and a header beam carrying a blue wheelchair access sign, a framed swing leaf with round infill bars standing open into the queue, paired stainless handrails at adult and child height on the approach, a tapered rubber threshold ramp with grip grooves, and a push-button operator bollard. Material controls: stainless rails, powder-coated frame, rubber ramp, access signage. Festival, twilight and heritage presets.",
  tags: ["accessible entrance", "wheelchair access", "queue gate", "swing gate", "handrail", "step-free", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2600,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#c3cbc8", { label: "Stainless handrails and symbol" });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated posts, beam and gate leaf" });
const rubber = param("rubber", "#292f33", { label: "Rubber threshold ramp" });
const signage = param("signage", "#1f5fae", { label: "Access sign and operator button" });

presets({
  festival: { stainlessSteel: "#e4e1d6", powderCoat: "#d47452", rubber: "#3c4245", signage: "#2a72c8" },
  twilight: { stainlessSteel: "#8f9fa5", powderCoat: "#35576f", rubber: "#20262a", signage: "#2c4f8f" },
  heritage: { stainlessSteel: "#c9a95c", powderCoat: "#2e3b33", rubber: "#3a3328", signage: "#1d4f7a" },
});

const p = assembly("accessible-entry-queue-gate");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);

const GX = 560; // gate post centre offset (about 1 m clear opening)
const POST_H = 2300;
const RAIL_Y0 = -1300;

// Tapered rubber threshold ramp with grip grooves across the opening.
add("threshold-ramp", longSide([[-700, 0], [-560, 25], [560, 25], [700, 0]], 2 * GX + 200).color(rubber));
for (let k = 0; k < 5; k++) add(`grip-groove-${k}`, box(2 * GX - 40, 30, 6, true).translate(0, -420 + k * 210, 27).color(powderCoat));

// Gate posts with ball caps, and the header beam carrying the access sign.
for (const sx of [-1, 1]) {
  const side = sx > 0 ? "r" : "l";
  add(`gate-post-${side}`, cylinder(POST_H, 50, 16).translate(sx * GX, 0, 0).color(powderCoat));
  add(`gate-post-foot-${side}`, cylinder(20, 110, 16).translate(sx * GX, 0, 0).color(stainlessSteel));
  add(`gate-post-cap-${side}`, sphere(65).translate(sx * GX, 0, POST_H + 20).color(stainlessSteel));
}
add("header-beam", box(2 * GX + 200, 120, 160, true).translate(0, 0, POST_H - 140).color(powderCoat));
add("access-sign", box(620, 30, 560, true).translate(0, -20, POST_H + 230).color(signage));
add("access-sign-border", front([[-330, POST_H - 60], [330, POST_H - 60], [330, POST_H + 520], [-330, POST_H + 520]], 20, 0).color(stainlessSteel));
// Wheelchair symbol: head, back-and-seat body, and a wheel ring.
const SY = -35;
add("symbol-head", cylinder(10, 45, 16).rotateX(90).translate(-60, SY, POST_H + 400).color(stainlessSteel));
add("symbol-body", front([[-90, POST_H + 340], [-40, POST_H + 340], [-40, POST_H + 210], [90, POST_H + 210], [130, POST_H + 80], [90, POST_H + 70], [60, POST_H + 160], [-90, POST_H + 160]], 10, SY - 10).color(stainlessSteel));
add("symbol-wheel", torus(110, 18, 20).rotateX(90).translate(-40, SY - 5, POST_H + 170).color(stainlessSteel));

// Swing leaf: tube frame with round infill bars, hinged on the right post
// and standing open into the queue.
const LEAF_W = 2 * GX - 80;
const leaf = [
  cylinder(LEAF_W, 25, 12).rotateY(-90).translate(-40, 0, 1050),
  cylinder(LEAF_W, 25, 12).rotateY(-90).translate(-40, 0, 120),
  cylinder(930, 25, 12).translate(-40 - LEAF_W, 0, 120),
  cylinder(930, 25, 12).translate(-60, 0, 120),
];
for (let k = 1; k < 8; k++) leaf.push(cylinder(930, 12, 8).translate(-40 - (k * LEAF_W) / 8, 0, 120));
const swing = (s: Shape) => s.rotateZ(-55).translate(GX, 0, 0);
for (const [i, s] of leaf.entries()) add(`gate-leaf-${i}`, swing(s).color(i < 4 ? powderCoat : stainlessSteel));
add("gate-latch", swing(box(70, 90, 160, true).translate(-40 - LEAF_W, 0, 900)).color(signage));
for (const z of [250, 950]) add(`gate-hinge-${z}`, cylinder(90, 60, 12).translate(GX, 0, z).color(stainlessSteel));

// Paired approach handrails at adult (900) and child (700) height.
for (const sx of [-1, 1]) {
  const side = sx > 0 ? "r" : "l";
  const x = sx * GX;
  for (const y of [RAIL_Y0, RAIL_Y0 / 2]) add(`rail-post-${side}-${-y}`, cylinder(920, 25, 12).translate(x, y, 0).color(stainlessSteel));
  for (const z of [700, 900]) {
    add(`handrail-${side}-${z}`, cylinder(-RAIL_Y0 - 50, 22, 12).rotateX(-90).translate(x, RAIL_Y0, z).color(stainlessSteel));
    add(`handrail-end-${side}-${z}`, sphere(32).translate(x, RAIL_Y0, z).color(stainlessSteel));
  }
}

// Push-button operator bollard on the approach.
add("operator-bollard", cylinder(1000, 70, 16).translate(-GX - 300, RAIL_Y0 / 2, 0).color(powderCoat));
add("operator-head", box(170, 170, 60, true).rotateX(-20).translate(-GX - 300, RAIL_Y0 / 2, 1030).color(powderCoat));
add("operator-button", cylinder(30, 55, 16).rotateX(70).translate(-GX - 300, RAIL_Y0 / 2 - 10, 1060).color(signage));

return p.model();
