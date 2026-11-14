// SPDX-License-Identifier: CC0-1.0
// Parade rope stanchion pair: the portable post-and-rope set staff roll out
// to hold the crowd line along the parade route.
// What makes it a rope stanchion rather than two poles: weighted domed cast
// bases, polished posts with turned collars and ball tops, a thick velvet
// rope that sags in a real catenary between brass snap hooks on eyelet
// rings, and a "parade route" plaque hung from the middle of the rope.
// Generic visualization geometry at about real size (posts 2.2 m apart,
// about 1 m tall), millimetres, Z up, crowd side on -Y, standing on z = 0.
meta({
  name: "parade-rope-stanchion",
  license: "CC0-1.0",
  title: "Parade rope stanchion pair",
  description: "Portable parade crowd-control rope set at about real size: two weighted domed cast bases, polished posts with turned collars and ball tops, a velvet rope sagging in a catenary between brass snap hooks on eyelet rings, and a hanging parade-route plaque. Material controls: polished post metal, cast base, velvet rope, plaque enamel. Festival, twilight and red-carpet presets.",
  tags: ["rope stanchion", "crowd control", "velvet rope", "queue post", "parade", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const brass = param("brass", "#c9a54a", { label: "Polished posts, collars and hooks" });
const castBase = param("castBase", "#2c2f33", { label: "Weighted cast bases" });
const velvet = param("velvet", "#9e2234", { label: "Velvet rope" });
const enamel = param("enamel", "#1f5f8b", { label: "Parade plaque enamel" });

presets({
  festival: { brass: "#e0bd5a", castBase: "#3a4a5c", velvet: "#d6402f", enamel: "#f2c230" },
  twilight: { brass: "#8f9ca3", castBase: "#1d2329", velvet: "#3d4f8f", enamel: "#2b3f55" },
  redCarpet: { brass: "#d4af37", castBase: "#141414", velvet: "#7a0f1e", enamel: "#141414" },
});

const p = assembly("parade-rope-stanchion");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// A round rod from a to b in the plane y = const.
const rodXZ = (y: number, a: [number, number], b: [number, number], r: number) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return cylinder(Math.sqrt(dx * dx + dz * dz), r, 10).rotateY((Math.atan2(dx, dz) * 180) / Math.PI).translate(a[0], y, a[1]);
};

const XP = 1100;
const HOOK_Z = 900;
const SAG = 230;

for (const sx of [-1, 1]) {
  const s = sx < 0 ? "l" : "r";
  const x = sx * XP;
  add(`base-${s}`, turned([[0, 0], [190, 0], [190, 18], [160, 48], [90, 88], [44, 112], [0, 112]]).translate(x, 0, 0).color(castBase));
  add(`base-collar-${s}`, turned([[0, 108], [52, 108], [40, 140], [0, 140]]).translate(x, 0, 0).color(brass));
  add(`post-${s}`, cylinder(810, 28, 14).translate(x, 0, 135).color(brass));
  add(`neck-collar-${s}`, turned([[0, 940], [34, 940], [44, 960], [34, 980], [0, 980]]).translate(x, 0, 0).color(brass));
  add(`ball-top-${s}`, sphere(50).translate(x, 0, 1025).color(brass));
  // Eyelet ring on the inner side of the post and the rope's snap hook.
  add(`eyelet-${s}`, torus(26, 7, 12).rotateX(90).translate(x - sx * 50, 0, HOOK_Z).color(brass));
  add(`hook-${s}`, rodXZ(0, [x - sx * 70, HOOK_Z - 10], [x - sx * 150, HOOK_Z - 40], 22).color(brass));
}

// Velvet rope sagging in a catenary-like curve between the hooks.
const X0 = XP - 150;
const N = 12;
const ropeAt = (t: number): [number, number] => {
  const x = -X0 + 2 * X0 * t;
  const u = x / X0;
  return [x, HOOK_Z - 40 - SAG * (1 - (Math.cosh(1.2 * u) - 1) / (Math.cosh(1.2) - 1))];
};
for (let k = 0; k < N; k++) {
  const a = ropeAt(k / N);
  const b = ropeAt((k + 1) / N);
  add(`rope-${k}`, rodXZ(0, a, b, 26).color(velvet));
  if (k > 0) add(`rope-joint-${k}`, sphere(26).translate(a[0], 0, a[1]).color(velvet));
}

// Parade-route plaque hung from the lowest point of the rope.
const LOW = HOOK_Z - 40 - SAG;
for (const sx of [-1, 1]) add(`plaque-strap-${sx < 0 ? "l" : "r"}`, box(16, 10, 70, true).translate(sx * 110, -20, LOW - 40).color(brass));
add("plaque", extrudeRoundedRect(380, 190, 30, 16, { axis: "y" }).translate(0, -30, LOW - 160).color(enamel));
add("plaque-border", extrudeRoundedRect(340, 150, 20, 4, { axis: "y" }).translate(0, -34, LOW - 160).color(brass));
add("plaque-panel", extrudeRoundedRect(320, 130, 16, 4, { axis: "y" }).translate(0, -38, LOW - 160).color(enamel));
const STAR = Array.from({ length: 10 }, (_, k) => {
  const a = Math.PI / 2 + (k * Math.PI) / 5;
  const r = k % 2 === 0 ? 46 : 19;
  return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
});
add("plaque-star", extrudePolygon(STAR, 6).rotateX(90).translate(-100, -38, LOW - 160).color(brass));
for (let k = 0; k < 3; k++) add(`plaque-arrow-${k}`, extrudePolygon([[0, -32], [34, 0], [0, 32], [-16, 32], [18, 0], [-16, -32]], 6).rotateX(90).translate(10 + k * 50, -38, LOW - 160).color(brass));

return p.model();
