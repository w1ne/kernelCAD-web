// SPDX-License-Identifier: CC0-1.0
// Ride load platform: the raised steel deck where guests wait at numbered
// boarding bays and step across into a ride vehicle.
// What makes it a load platform rather than a stage: a deck held up on round
// steel columns with a fascia skirt; three rubber-matted boarding bays along
// the vehicle edge (-Y), each behind its own pair of swing gate leaves with a
// numbered bay disc on a mast; a painted safety stripe marking the platform
// edge; a stringer stair coming up from the queue on -X with tube handrails;
// and a guard rail round the back and far end.
// Generic visualization geometry at about real size (about 4.1 m long with
// the stair, 1.45 m deep, deck at 0.86 m), millimetres, Z up, standing on z = 0.
meta({
  name: "ride-load-platform",
  license: "CC0-1.0",
  title: "Ride load platform",
  description: "Raised ride load platform at about real size: steel deck on round columns with a fascia skirt, three rubber-matted boarding bays behind swing gate pairs with numbered bay discs, a painted safety edge stripe, a stringer stair from the queue with tube handrails, and a rear guard rail. Material controls: painted steel, concrete treads, rubber matting, safety paint. Festival, twilight and safety presets.",
  tags: ["load platform", "boarding bay", "ride station", "swing gate", "stairs", "handrail", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#4f7a8c", { label: "Painted steel deck, gates and rails" });
const concrete = param("concrete", "#a3a49b", { label: "Concrete stair treads" });
const rubber = param("rubber", "#2c3236", { label: "Rubber bay matting" });
const safetyPaint = param("safetyPaint", "#f0c230", { label: "Safety edge paint and bay discs" });

presets({
  festival: { steel: "#c8553d", concrete: "#c2bfb2", rubber: "#3c4245", safetyPaint: "#f6d65c" },
  twilight: { steel: "#2f4858", concrete: "#6f7477", rubber: "#20262a", safetyPaint: "#d9a63a" },
  safety: { steel: "#59636a", concrete: "#9a9b94", rubber: "#2b2f33", safetyPaint: "#ffd400" },
});

const p = assembly("ride-load-platform");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Round rod from point a to point b.
const rodAB = (a: [number, number, number], b: [number, number, number], r: number, n = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / len) * 180) / Math.PI;
  const az = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(len, r, n).rotateY(tilt).rotateZ(az).translate(a[0], a[1], a[2]);
};
// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t: number, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);

const DX = 1400;
const DY = 725;
const TOP = 860;
const RAIL = 1000;

// Deck slab, fascia skirt and round columns.
add("deck", box(2 * DX, 2 * DY, 120, true).translate(0, 0, TOP - 60).color(steel));
add("fascia-front", box(2 * DX, 30, 200, true).translate(0, -DY - 15, TOP - 100).color(steel));
add("fascia-end", box(30, 2 * DY, 200, true).translate(DX + 15, 0, TOP - 100).color(steel));
let c = 0;
for (const x of [-DX + 150, 0, DX - 150]) {
  for (const y of [-DY + 150, DY - 150]) {
    add(`column-${c}`, cylinder(TOP - 120, 70, 12).color(steel).translate(x, y, 0));
    add(`column-base-${c++}`, box(240, 240, 20, true).translate(x, y, 10).color(concrete));
  }
}

// Three boarding bays on the vehicle edge: rubber mat, safety stripe and a
// pair of swing gate leaves between posts, with a numbered disc on a mast.
const BAYS = [-900, 0, 900];
const GY = -DY + 60;
add("edge-stripe", box(2 * DX, 90, 6, true).translate(0, -DY + 45, TOP + 3).color(safetyPaint));
BAYS.forEach((bx, i) => {
  add(`bay-mat-${i}`, box(760, 560, 12, true).translate(bx, -260, TOP + 6).color(rubber));
  add(`bay-mat-stripe-${i}`, box(760, 40, 8, true).translate(bx, -560, TOP + 4).color(safetyPaint));
  for (const sx of [-1, 1]) {
    const px = bx + sx * 380;
    add(`gate-post-${i}-${sx > 0 ? "r" : "l"}`, cylinder(RAIL, 32, 12).translate(px, GY, TOP).color(steel));
    add(`gate-post-cap-${i}-${sx > 0 ? "r" : "l"}`, sphere(36).translate(px, GY, TOP + RAIL).color(rubber));
    // Leaf frame, swung slightly open toward the deck.
    const hinge = [px - sx * 30, GY, TOP];
    const leaf = (s: Shape) => s.rotateZ(sx > 0 ? 18 : -18).translate(hinge[0], hinge[1], hinge[2]);
    const lw = 330;
    add(`gate-top-${i}-${sx > 0 ? "r" : "l"}`, leaf(cylinder(lw, 20, 10).rotateY(-90 * sx).translate(0, 0, 900)).color(steel));
    add(`gate-bottom-${i}-${sx > 0 ? "r" : "l"}`, leaf(cylinder(lw, 20, 10).rotateY(-90 * sx).translate(0, 0, 200)).color(steel));
    for (let k = 1; k <= 3; k++) add(`gate-bar-${i}-${sx > 0 ? "r" : "l"}-${k}`, leaf(cylinder(700, 12, 8).translate(-sx * (k * lw) / 3, 0, 200)).color(steel));
    add(`gate-panel-${i}-${sx > 0 ? "r" : "l"}`, leaf(box(lw - 20, 8, 160, true).translate((-sx * lw) / 2, -14, 760)).color(safetyPaint));
  }
  // Bay number disc on a short mast behind the gates, facing the queue.
  add(`bay-mast-${i}`, cylinder(1350, 22, 10).translate(bx, -DY + 230, TOP).color(steel));
  add(`bay-disc-${i}`, cylinder(30, 170, 20).rotateX(90).translate(bx, -DY + 215, TOP + 1450).color(safetyPaint));
  for (let k = 0; k <= i; k++) add(`bay-number-${i}-${k}`, box(34, 12, 170, true).translate(bx + (k - i / 2) * 70, -DY + 180, TOP + 1450).color(rubber));
});
// Fixed rail panels between the gate pairs.
for (const x of [-450, 450]) {
  add(`front-rail-${x > 0 ? "r" : "l"}`, cylinder(240, 26, 10).rotateY(90).translate(x - 120, GY, TOP + RAIL).color(steel));
}

// Guard rail round the back (+Y) and the far (+X) end.
let rp = 0;
for (const x of [-DX + 40, -460, 460, DX - 40]) add(`rear-post-${rp++}`, cylinder(RAIL, 32, 12).translate(x, DY - 40, TOP).color(steel));
for (const y of [-DY + 60, 0]) add(`end-post-${rp++}`, cylinder(RAIL, 32, 12).translate(DX - 40, y, TOP).color(steel));
for (const z of [RAIL, RAIL / 2]) {
  add(`rear-rail-${z}`, cylinder(2 * DX - 80, 26, 10).rotateY(90).translate(-DX + 40, DY - 40, TOP + z).color(steel));
  add(`end-rail-${z}`, cylinder(2 * DY - 100, 26, 10).rotateX(-90).translate(DX - 40, -DY + 60, TOP + z).color(steel));
}

// Stringer stair coming up from the queue on -X.
const STEPS = 5;
const RUN = 260;
const RISE = TOP / (STEPS + 1);
const XB = -DX - STEPS * RUN;
const SY = 150;
const SW = 1000;
const stringer = [[XB, 0], [XB + 220, 0], [-DX, TOP - 200], [-DX, TOP], [XB, RISE + 40]];
for (const sy of [-1, 1]) add(`stringer-${sy > 0 ? "b" : "f"}`, side(stringer, 40, SY + sy * (SW / 2 + 20)).color(steel));
for (let k = 0; k < STEPS; k++) {
  add(`tread-${k}`, box(RUN, SW, 50, true).translate(XB + k * RUN + RUN / 2, SY, RISE * (k + 1) - 25).color(concrete));
  add(`tread-nosing-${k}`, box(40, SW, 10, true).translate(XB + k * RUN + 20, SY, RISE * (k + 1) + 5).color(safetyPaint));
}
for (const sy of [-1, 1]) {
  const y = SY + sy * (SW / 2 + 20);
  const a: [number, number, number] = [XB + 120, y, RISE + RAIL - 120];
  const b: [number, number, number] = [-DX + 40, y, TOP + RAIL];
  add(`stair-post-low-${sy > 0 ? "b" : "f"}`, cylinder(RAIL - 120, 30, 12).translate(XB + 120, y, RISE).color(steel));
  add(`stair-post-high-${sy > 0 ? "b" : "f"}`, cylinder(RAIL, 30, 12).translate(-DX + 40, y, TOP).color(steel));
  add(`stair-handrail-${sy > 0 ? "b" : "f"}`, rodAB(a, b, 26).color(steel));
  add(`stair-midrail-${sy > 0 ? "b" : "f"}`, rodAB([a[0], y, a[2] - 450], [b[0], y, b[2] - 450], 18).color(steel));
}

return p.model();
