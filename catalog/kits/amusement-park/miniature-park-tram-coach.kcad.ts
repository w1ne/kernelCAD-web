// SPDX-License-Identifier: CC0-1.0
// Miniature park tram coach: the open-air carriage that guests ride behind
// the park railway engine.
// What makes it a park coach rather than a flat cart: a panelled enamel body
// with a step-in side opening, slatted timber cross benches with curved backs
// facing each other in bays, turned posts holding a shallow curved canopy
// with a scalloped valance, a lining stripe, buffer beams with buffers and
// couplings at both ends, and four spoked wheels in a sprung bogie frame.
// Generic visualization geometry at about real size (about 2.3 m long over
// the buffers, 1.1 m wide under the canopy, 1.85 m to the roof), millimetres,
// Z up, track along X, guest side on -Y, standing on its wheel treads at z = 0.
meta({
  name: "miniature-park-tram-coach",
  license: "CC0-1.0",
  title: "Miniature park tram coach",
  description: "Open-air park railway coach at about real size: panelled enamel body with a side step-in opening and lining stripe, slatted timber cross benches with curved backs in facing bays, turned canopy posts, a curved canopy roof with scalloped valance, buffer beams with buffers and couplings, and four spoked wheels in a sprung frame. Material controls: baked enamel, bench timber, canopy, ironwork. Festival, twilight and heritage presets.",
  tags: ["park railway", "miniature railway", "train coach", "carriage", "open coach", "train ride", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 7000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enamel = param("enamel", "#2f7d4f", { label: "Baked enamel body, beams and wheel centres" });
const timber = param("timber", "#b9844f", { label: "Varnished bench timber" });
const canopy = param("canopy", "#f1e6c8", { label: "Canopy roof and valance" });
const ironwork = param("ironwork", "#2b2f33", { label: "Frame, wheels, posts and buffers" });

presets({
  festival: { enamel: "#2f6fb8", timber: "#c99559", canopy: "#e0a033", ironwork: "#30353a" },
  twilight: { enamel: "#4a3f78", timber: "#8e6a48", canopy: "#c9b8e0", ironwork: "#202428" },
  heritage: { enamel: "#7a2a22", timber: "#a87445", canopy: "#efe3c4", ironwork: "#26292c" },
});

const p = assembly("miniature-park-tram-coach");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t along +X from x0.
const profileYZ = (pts, t: number, x0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90).translate(x0 + t / 2, 0, 0);
const rect = (x0: number, z0: number, x1: number, z1: number) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const L = 1900;
const HALF_W = 420;
const WR = 200;
const AX = [-560, 560];
const FLOOR = 470;
const WAIST = 820;
const ROOF = 1720;

// Underframe, buffer beams, buffers and couplings.
add("underframe", box(L, 2 * HALF_W - 160, 140, true).translate(0, 0, 360).color(ironwork));
for (const [s, x] of [["front", -L / 2 - 40], ["rear", L / 2 + 40]] as const) {
  const dir = x < 0 ? -1 : 1;
  add(`buffer-beam-${s}`, box(80, 2 * HALF_W, 180, true).translate(x, 0, 380).color(enamel));
  for (const y of [-280, 280]) {
    add(`buffer-${s}-${y < 0 ? "f" : "b"}`, cylinder(100, 30, 12).rotateY(90).translate(dir < 0 ? x - 140 : x + 40, y, 380).color(ironwork));
    add(`buffer-head-${s}-${y < 0 ? "f" : "b"}`, cylinder(18, 62, 16).rotateY(90).translate(dir < 0 ? x - 158 : x + 140, y, 380).color(ironwork));
  }
  add(`coupling-${s}`, box(90, 50, 40, true).translate(x + dir * 85, 0, 340).color(ironwork));
}

// Spoked wheels with leaf-spring hangers on each side.
for (const y of [-HALF_W + 70, HALF_W - 70]) {
  const s = y < 0 ? "f" : "b";
  for (const [i, x] of AX.entries()) {
    add(`wheel-tread-${s}-${i}`, torus(WR - 20, 20, 24).rotateX(90).translate(x, y, WR).color(ironwork));
    add(`wheel-centre-${s}-${i}`, cylinder(24, WR - 36, 20).rotateX(90).translate(x, y + 12, WR).subtract(
      cylinder(40, WR - 62, 20).rotateX(90).translate(x, y + 20, WR)).color(enamel));
    for (let k = 0; k < 4; k++) add(`spoke-${s}-${i}-${k}`, box(2 * (WR - 50), 24, 20, true).rotateY(k * 45).translate(x, y, WR).color(enamel));
    add(`axlebox-${s}-${i}`, box(110, 60, 110, true).translate(x, y + (y < 0 ? -40 : 40), WR + 20).color(ironwork));
    add(`spring-${s}-${i}`, face([[x - 230, WR + 120], [x + 230, WR + 120], [x + 150, WR + 80], [x - 150, WR + 80]], 40, y + (y < 0 ? -60 : 20)).color(ironwork));
  }
}

// Body: floor, panelled sides with a step-in opening, end panels, stripe.
add("floor", box(L, 2 * HALF_W, 60, true).translate(0, 0, FLOOR - 30).color(timber));
const OPEN = [-200, 200];
for (const y of [-1, 1]) {
  const s = y < 0 ? "f" : "b";
  const y0 = y < 0 ? -HALF_W : HALF_W - 40;
  for (const [h, x0, x1] of [["l", -L / 2, OPEN[0]], ["r", OPEN[1], L / 2]] as const) {
    let side = face(rect(x0, FLOOR - 120, x1, WAIST), 40, y0);
    for (const xc of [-640, -330, 330, 640].filter((v) => v > x0 && v < x1))
      side = side.subtract(face(rect(xc - 120, FLOOR + 10, xc + 120, WAIST - 70), 20, y < 0 ? y0 - 5 : y0 + 25));
    add(`side-${s}-${h}`, side.color(enamel));
  }
  add(`stripe-${s}-l`, face(rect(-L / 2, WAIST - 50, OPEN[0], WAIST - 30), 10, y < 0 ? y0 - 8 : y0 + 38).color(canopy));
  add(`stripe-${s}-r`, face(rect(OPEN[1], WAIST - 50, L / 2, WAIST - 30), 10, y < 0 ? y0 - 8 : y0 + 38).color(canopy));
  add(`step-${s}`, box(OPEN[1] - OPEN[0] + 60, 160, 30, true).translate(0, y * (HALF_W + 40), FLOOR - 160).color(ironwork));
  add(`step-hanger-${s}`, box(30, 40, 150, true).translate(0, y * (HALF_W + 10), FLOOR - 90).color(ironwork));
  add(`cap-rail-${s}`, box(L + 20, 70, 30, true).translate(0, y * (HALF_W - 20), WAIST + 15).color(timber));
}
for (const [s, x] of [["front", -L / 2], ["rear", L / 2 - 40]] as const)
  add(`end-panel-${s}`, profileYZ([[-HALF_W, FLOOR - 120], [HALF_W, FLOOR - 120], [HALF_W, WAIST + 80], [0, WAIST + 160], [-HALF_W, WAIST + 80]], 40, x).color(enamel));

// Slatted cross benches with curved backs, facing each other in two bays.
const bench = (xc: number, facing: number, tag: string) => {
  const bx = xc - facing * 140;
  add(`bench-legs-${tag}`, box(300, 2 * HALF_W - 120, 40, true).translate(xc, 0, FLOOR + 230).color(ironwork));
  for (const y of [-HALF_W + 90, HALF_W - 90]) add(`bench-leg-${tag}-${y < 0 ? "f" : "b"}`, box(40, 40, 230, true).translate(xc, y, FLOOR + 115).color(ironwork));
  for (let k = 0; k < 4; k++) add(`seat-slat-${tag}-${k}`, box(60, 2 * HALF_W - 100, 30, true).translate(xc - 105 + k * 70, 0, FLOOR + 265).color(timber));
  const back = [];
  for (let k = 0; k <= 5; k++) {
    const t = k / 5;
    back.push([bx - facing * 40 * t * t, FLOOR + 280 + 400 * t]);
  }
  for (let k = 5; k >= 0; k--) {
    const t = k / 5;
    back.push([bx - facing * (40 * t * t + 30), FLOOR + 280 + 400 * t]);
  }
  add(`bench-back-${tag}`, face(back, 2 * HALF_W - 120, -HALF_W + 60).color(timber));
};
bench(-770, 1, "a");
bench(-330, -1, "b");
bench(330, 1, "c");
bench(770, -1, "d");

// Turned canopy posts and the shallow curved roof with scalloped valance.
for (const x of [-L / 2 + 40, -230, 230, L / 2 - 40])
  for (const y of [-HALF_W + 20, HALF_W - 20]) {
    const tag = `${x}-${y < 0 ? "f" : "b"}`;
    add(`post-${tag}`, cylinder(ROOF - WAIST, 22, 10).translate(x, y, WAIST).color(ironwork));
    add(`post-collar-${tag}`, sphere(36).translate(x, y, WAIST + 40).color(ironwork));
  }
const RW = HALF_W + 120;
const roof = [];
for (let k = 0; k <= 8; k++) {
  const a = Math.PI - (k * Math.PI) / 8;
  roof.push([RW * Math.cos(a), ROOF + 120 * Math.sin(a)]);
}
for (let k = 8; k >= 0; k--) {
  const a = Math.PI - (k * Math.PI) / 8;
  roof.push([(RW - 30) * Math.cos(a), ROOF + 25 + 100 * Math.sin(a)]);
}
add("canopy-roof", profileYZ(roof, L + 200, -L / 2 - 100).color(canopy));
add("roof-ridge", cylinder(L + 220, 24, 10).rotateY(90).translate(-L / 2 - 110, 0, ROOF + 120).color(enamel));
const scallops = [[-L / 2 - 100, ROOF + 10], [L / 2 + 100, ROOF + 10]];
const n = 10;
const sw = (L + 200) / n;
for (let i = n - 1; i >= 0; i--) {
  const xc = -L / 2 - 100 + sw * (i + 0.5);
  for (let k = 1; k < 6; k++) scallops.push([xc + (sw / 2) * Math.cos((k * Math.PI) / 6), ROOF + 10 - 90 * Math.sin((k * Math.PI) / 6)]);
  if (i > 0) scallops.push([xc - sw / 2, ROOF + 10]);
}
for (const y of [-1, 1]) add(`valance-${y < 0 ? "f" : "b"}`, face(scallops, 12, y * (RW - 30) - 6).color(enamel));

return p.model();
