// SPDX-License-Identifier: CC0-1.0
// Rope net tunnel: a short crawl-through play tunnel in a playground.
// What makes it a net tunnel rather than a pipe: six round steel hoops
// standing on a rubber safety mat, joined at the feet by ground rails, with
// a rope net stretched over them - straight ropes running the length of the
// tunnel crossed by a rope hoop in every bay - so you see through it; and
// thick foam bumper rings on the two entry hoops where children's heads go.
// Generic visualization geometry at about real size (about 3 m long, 1.6 m
// wide, 0.85 m tall inside), millimetres, Z up, tunnel running along X,
// standing on z = 0.
meta({
  name: "rope-net-tunnel",
  license: "CC0-1.0",
  title: "Rope net tunnel",
  description: "Crawl-through rope net play tunnel at about real size: six round steel hoops on a rubber safety mat with ground rails at the feet, a see-through rope net of lengthwise ropes crossed by a rope hoop in every bay, and foam bumper rings on both entry hoops. Material controls: painted steel, nylon rope, rubber mat, foam padding. Festival, twilight and safety presets.",
  tags: ["net tunnel", "crawl tunnel", "rope net", "playground", "play equipment", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction", "playground"],
  triangleBudget: 9000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#2f7d5b", { label: "Painted steel hoops and rails" });
const nylon = param("nylon", "#d8a640", { label: "Nylon rope net" });
const rubber = param("rubber", "#5b6b70", { label: "Rubber safety mat" });
const padding = param("padding", "#d6473d", { label: "Foam bumper padding" });

presets({
  festival: { steel: "#3f6fb5", nylon: "#f0c35a", rubber: "#8a5a44", padding: "#e65a8c" },
  twilight: { steel: "#2f4858", nylon: "#8fa3b0", rubber: "#30383c", padding: "#6a4c93" },
  safety: { steel: "#59636a", nylon: "#e2d6b6", rubber: "#3a3f42", padding: "#ffd400" },
});

const p = assembly("rope-net-tunnel");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
// Upper half of a ring in the YZ plane, centred on the axis at height z0.
const hoop = (R: number, r: number, seg: number) =>
  torus(R, r, seg).rotateY(90).intersect(box(4 * r, 2 * (R + r) + 20, R + r + 20, true).translate(0, 0, (R + r + 20) / 2));

const MAT = 30;
const R = 780;
const HOOPS = [-1250, -750, -250, 250, 750, 1250];

// Rubber safety mat with a raised border.
add("safety-mat", extrudePolygon(rr(3200, 2000, 250), MAT).color(rubber));

// Steel hoops on foot plates, joined by ground rails.
HOOPS.forEach((x, i) => {
  add(`hoop-${i}`, hoop(R, 38, 32).translate(x, 0, MAT).color(steel));
  for (const sy of [-1, 1]) add(`hoop-foot-${i}-${sy > 0 ? "b" : "f"}`, box(160, 160, 12, true).translate(x, sy * R, MAT + 6).color(steel));
});
for (const sy of [-1, 1]) add(`ground-rail-${sy > 0 ? "b" : "f"}`, cylinder(2500, 30, 10).rotateY(90).translate(-1250, sy * R, MAT + 45).color(steel));

// Foam bumper rings on the two entry hoops.
for (const x of [-1250, 1250]) add(`bumper-${x > 0 ? "exit" : "entry"}`, hoop(R, 75, 28).translate(x, 0, MAT + 10).color(padding));

// Rope net: lengthwise ropes over the hoops, and a rope hoop in every bay.
const RR = R - 10;
for (let k = 0; k < 9; k++) {
  const a = ((12 + k * 19.5) * Math.PI) / 180;
  add(`rope-long-${k}`, cylinder(2500, 14, 6).rotateY(90).translate(-1250, RR * Math.cos(a), MAT + RR * Math.sin(a)).color(nylon));
}
for (let i = 0; i < HOOPS.length - 1; i++) {
  for (const f of [0.34, 0.67]) add(`rope-hoop-${i}-${f > 0.5 ? "b" : "a"}`, hoop(RR, 14, 22).translate(HOOPS[i] + f * 500, 0, MAT).color(nylon));
}
// Rope knots where the net ties to the crown of each hoop.
HOOPS.forEach((x, i) => add(`crown-knot-${i}`, sphere(40).translate(x, 0, MAT + R + 30).color(nylon)));

return p.model();
