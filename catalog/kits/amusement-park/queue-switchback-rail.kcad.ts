// SPDX-License-Identifier: CC0-1.0
// Queue switchback rail: the folded line of handrails that turns one long
// ride queue into two lanes walking back on each other.
// What makes it a switchback rather than a fence: two parallel lanes of round
// tube handrails on posts with bolted floor flanges, a mid-height rail and
// infill bars, a semicircular U-turn hoop at the far end that guests walk
// round, a "queue starts here" entry sign with a post-top wait-time board, and
// end caps on every post.
// Generic visualization geometry at about real size (about 3.6 m long, 1.2 m
// across, 1 m rail height), millimetres, Z up, entry on -X, standing on z = 0.
meta({
  name: "queue-switchback-rail",
  license: "CC0-1.0",
  title: "Queue switchback rail",
  description: "Ride queue switchback at about real size: two parallel lanes of round tube handrails on flanged posts with mid rails and infill bars, a semicircular U-turn hoop at the far end, post end caps, a queue-entry sign and a wait-time board on the entry post. Material controls: galvanised steel, rail enamel, floor flanges, signage. Park green, festival and twilight presets.",
  tags: ["queue", "switchback", "handrail", "queue line", "crowd control", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param("galvanizedSteel", "#8f9a9e", { label: "Galvanised posts and infill" });
const enamel = param("enamel", "#2f6b4f", { label: "Rail enamel" });
const concrete = param("concrete", "#6d706c", { label: "Floor flanges and caps" });
const signage = param("signage", "#f2c14e", { label: "Sign face" });

presets({
  parkGreen: { galvanizedSteel: "#8f9a9e", enamel: "#2f6b4f", concrete: "#6d706c", signage: "#f2c14e" },
  festival: { galvanizedSteel: "#a9b2b2", enamel: "#c8473a", concrete: "#7a7a72", signage: "#ffe08a" },
  twilight: { galvanizedSteel: "#5f6d73", enamel: "#2d4f7c", concrete: "#4b5054", signage: "#e7a64a" },
});

const p = assembly("queue-switchback-rail");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const L = 3200;
const X0 = -1600;
const LANE = 600;
const RAIL_H = 1000;
const MID_H = 560;
const xs = [0, 1, 2, 3, 4].map((k) => X0 + (k * L) / 4);
const ys = [-LANE, 0, LANE];
// Straight tube along X from x0 for len at (y, z).
const railX = (x0: number, len: number, y: number, z: number, r: number) => cylinder(len, r, 10).rotateY(90).translate(x0, y, z);

// Posts with floor flanges and caps on three rail lines (outer, centre, outer).
for (const y of ys) {
  for (const x of xs) {
    const n = `${Math.round(x)}-${y}`;
    add(`flange-${n}`, cylinder(12, 70, 12).translate(x, y, 0).color(concrete));
    add(`post-${n}`, cylinder(RAIL_H - 12, 25, 10).translate(x, y, 12).color(galvanizedSteel));
    add(`cap-${n}`, sphere(30).translate(x, y, RAIL_H).color(concrete));
  }
  add(`top-rail-${y}`, railX(X0, L, y, RAIL_H - 20, 22).color(enamel));
  add(`mid-rail-${y}`, railX(X0, L, y, MID_H, 16).color(enamel));
  for (let k = 0; k < 4; k++) {
    const xm = xs[k] + L / 8;
    add(`infill-${k}-${y}`, cylinder(RAIL_H - 20 - MID_H, 9, 6).translate(xm, y, MID_H).color(galvanizedSteel));
  }
}

// U-turn hoops at the far end: the centre line ends, the outer rails sweep
// round in a half circle so the lane turns back on itself.
const XE = X0 + L;
const hoop = (z: number, r: number) => torus(LANE, r, 24).subtract(box(LANE * 2 + 200, LANE * 2 + 200, 400, true).translate(-LANE - 100, 0, 0)).translate(XE, 0, z);
add("turn-hoop-top", hoop(RAIL_H - 20, 22).color(enamel));
add("turn-hoop-mid", hoop(MID_H, 16).color(enamel));
add("turn-post", cylinder(RAIL_H - 12, 25, 10).translate(XE + LANE, 0, 12).color(galvanizedSteel));
add("turn-flange", cylinder(12, 70, 12).translate(XE + LANE, 0, 0).color(concrete));
add("turn-cap", sphere(30).translate(XE + LANE, 0, RAIL_H).color(concrete));

// Entry sign on the near outer post and wait-time board on the centre post.
add("entry-sign-post", cylinder(700, 22, 10).translate(X0, -LANE, RAIL_H).color(galvanizedSteel));
add("entry-sign-board", box(560, 24, 320, true).translate(X0 + 280, -LANE - 30, RAIL_H + 520).color(enamel));
add("entry-sign-face", box(500, 8, 260, true).translate(X0 + 280, -LANE - 46, RAIL_H + 520).color(signage));
add("entry-arrow", extrudePolygon([[-150, -30], [60, -30], [60, -80], [170, 0], [60, 80], [60, 30], [-150, 30]], 8).rotateX(90).translate(X0 + 280, -LANE - 52, RAIL_H + 520).color(enamel));
add("wait-board", box(360, 30, 220, true).translate(X0, 0, RAIL_H + 160).color(enamel));
add("wait-face", box(300, 8, 160, true).translate(X0, -19, RAIL_H + 160).color(signage));
for (let k = 0; k < 2; k++) add(`wait-digit-${k}`, box(60, 6, 110, true).translate(X0 - 60 + k * 90, -26, RAIL_H + 160).color(concrete));
add("wait-board-stem", cylinder(60, 18, 8).translate(X0, 0, RAIL_H + 20).color(galvanizedSteel));

return p.model();
