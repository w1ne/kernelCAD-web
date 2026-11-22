// SPDX-License-Identifier: CC0-1.0
// Queue shade canopy: the open-sided striped shelter strung over a ride
// queue so guests wait in the shade.
// What makes it a queue canopy rather than a slab on poles: four round
// steel posts on bolted base plates; a ridge tube and raked rafters holding a
// gabled canvas roof sewn in alternating stripes; a scalloped valance along
// both long eaves; two queue rails running between the posts to guide the
// line; and enamel wayfinding arrows hanging from the front eave.
// Generic visualization geometry at about real size (about 3.6 m long,
// 1.7 m deep, 3.1 m to the ridge), millimetres, Z up, queue entry facing -Y,
// standing on z = 0.
meta({
  name: "queue-shade-canopy",
  license: "CC0-1.0",
  title: "Queue shade canopy",
  description: "Open-sided ride-queue shelter at about real size: four round steel posts on base plates, a ridge tube and raked rafters under a gabled canvas roof sewn in alternating stripes, scalloped valances on both eaves, two queue guide rails between the posts and enamel wayfinding arrows hanging from the front eave. Material controls: steel frame, canvas, stripe, enamel signs. Festival, twilight and seaside presets.",
  tags: ["canopy", "shade structure", "queue", "ride queue", "awning", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2200,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#5f6b72", { label: "Painted steel frame and rails" });
const canvas = param("canvas", "#f1e6c8", { label: "Canvas roof panels" });
const stripe = param("stripe", "#c8423a", { label: "Stripe panels and valance" });
const enamel = param("enamel", "#1f5f8b", { label: "Enamel wayfinding signs" });

presets({
  festival: { steel: "#9da3a0", canvas: "#fff3cf", stripe: "#e8862e", enamel: "#2a7a3e" },
  twilight: { steel: "#4f626c", canvas: "#d9cbe8", stripe: "#385b81", enamel: "#e0b440" },
  seaside: { steel: "#e9ecea", canvas: "#ffffff", stripe: "#2e78b8", enamel: "#d0473a" },
});

const p = assembly("queue-shade-canopy");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Round bar between two 3D points.
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const LX = 1600; // half post spacing along X
const LY = 600; // half post spacing along Y
const EAVE = 2600;
const RIDGE = 3050;
const SPAN = 850; // half roof width at the eave line
const PANELS = 6;
const LEN = 2 * LX + 400;

// Posts on bolted base plates.
[[-LX, -LY], [LX, -LY], [-LX, LY], [LX, LY]].forEach(([x, y], i) => {
  add(`base-plate-${i}`, box(260, 260, 20, true).translate(x, y, 10).color(steel));
  add(`post-${i}`, cylinder(EAVE + 60, 50, 12).translate(x, y, 0).color(steel));
});

// Ridge tube, eave tubes and raked rafters at each post pair.
add("ridge-tube", rod([-LEN / 2, 0, RIDGE - 40], [LEN / 2, 0, RIDGE - 40], 45, 10).color(steel));
for (const y of [-LY, LY]) add(`eave-tube-${y > 0 ? "back" : "front"}`, rod([-LEN / 2 + 60, y, EAVE], [LEN / 2 - 60, y, EAVE], 38, 10).color(steel));
for (const x of [-LX, LX]) {
  for (const y of [-LY, LY]) add(`rafter-${x > 0 ? "r" : "l"}-${y > 0 ? "back" : "front"}`, rod([x, y, EAVE + 60], [x, 0, RIDGE - 40], 32).color(steel));
}

// Gabled canvas roof in alternating stripes; each panel is a thin pitched shell.
const shell = [[-SPAN, EAVE - 40], [0, RIDGE], [SPAN, EAVE - 40], [SPAN, EAVE - 70], [0, RIDGE - 30], [-SPAN, EAVE - 70]];
for (let i = 0; i < PANELS; i++) {
  const w = LEN / PANELS;
  add(`roof-panel-${i}`, longSide(shell, w).translate(-LEN / 2 + w * (i + 0.5), 0, 0).color(i % 2 ? stripe : canvas));
}
add("ridge-cap", longSide([[-60, RIDGE - 10], [0, RIDGE + 25], [60, RIDGE - 10]], LEN + 20).color(stripe));

// Scalloped valance hanging from both long eaves.
const SCALLOPS = 12;
for (const side of [-1, 1]) {
  const pts: [number, number][] = [[-LEN / 2, EAVE - 55]];
  for (let k = 0; k < SCALLOPS; k++) {
    const x0 = -LEN / 2 + (LEN * k) / SCALLOPS;
    const w = LEN / SCALLOPS;
    for (let j = 1; j < 4; j++) {
      const a = (Math.PI * j) / 4;
      pts.push([x0 + w * (j / 4), EAVE - 200 - 140 * (Math.sin(a) - 1)]);
    }
    pts.push([x0 + w, EAVE - 200]);
  }
  pts.push([LEN / 2, EAVE - 55]);
  const y0 = side * (SPAN - 10) - (side > 0 ? 0 : 20);
  add(`valance-${side > 0 ? "back" : "front"}`, front(pts, 20, y0).color(stripe));
}

// Queue guide rails between the posts (top and knee height).
for (const y of [-LY, LY]) {
  for (const z of [950, 500]) add(`queue-rail-${y > 0 ? "back" : "front"}-${z}`, rod([-LX, y, z], [LX, y, z], 28).color(steel));
}
for (const x of [-LX / 3, LX / 3]) {
  for (const y of [-LY, LY]) add(`rail-stanchion-${x > 0 ? "r" : "l"}-${y > 0 ? "back" : "front"}`, cylinder(950, 30, 8).translate(x, y, 0).color(steel));
}

// Enamel wayfinding arrows hanging from the front eave, pointing toward the ride.
for (const [i, x] of [-900, 900].entries()) {
  for (const dx of [-160, 160]) add(`sign-hanger-${i}-${dx > 0 ? "r" : "l"}`, rod([x + dx, -LY, 2150], [x + dx, -LY, EAVE - 30], 8, 6).color(steel));
  const arrow = [[-260, 1950], [120, 1950], [120, 1890], [280, 2050], [120, 2210], [120, 2150], [-260, 2150]];
  add(`sign-arrow-${i}`, front(arrow.map(([ax, az]) => [ax + x, az]), 24, -LY - 12).color(enamel));
  add(`sign-panel-${i}`, front([[-280, 1930], [300, 1930], [300, 2230], [-280, 2230]].map(([ax, az]) => [ax + x, az]), 14, -LY + 12).color(canvas));
}

return p.model();
