// SPDX-License-Identifier: CC0-1.0
// Park pathway bollard light: the knee-high cast lamp post that lines the
// footpaths between lands and lights them after dark.
// What makes it a bollard light rather than a short post: a flared cast foot
// bolted to a round concrete footing, a fluted shaft with a decorative band,
// a glowing diffuser lens wrapped in stacked horizontal glare louvres that
// throw the light down onto the path, and an overhanging domed cap with a
// finial.
// Generic visualization geometry at about real size (about 0.4 m across the
// footing, 1 m tall), millimetres, Z up, standing on z = 0.
meta({
  name: "park-pathway-bollard-light",
  license: "CC0-1.0",
  title: "Park pathway bollard light",
  description: "Knee-high park pathway bollard light at about real size: round concrete footing with anchor bolts, flared cast-aluminium foot, fluted shaft with a decorative band, glowing diffuser lens behind stacked horizontal glare louvres, and an overhanging domed cap with a finial. Material controls: cast housing, lens glow, trim band, concrete. Festival, twilight and heritage-bronze presets.",
  tags: ["bollard light", "path light", "lamp post", "landscape lighting", "louvre", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const housing = param("housing", "#33424a", { label: "Cast-aluminium housing and louvres" });
const lens = param("lens", "#f6d98a", { label: "Diffuser lens glow" });
const trim = param("trim", "#b8913f", { label: "Decorative band and finial" });
const concrete = param("concrete", "#9a978f", { label: "Concrete footing" });

presets({
  festival: { housing: "#2e6fb3", lens: "#fff1b8", trim: "#e3b23c", concrete: "#b0aca2" },
  twilight: { housing: "#1f2a33", lens: "#ffd36b", trim: "#7d8f99", concrete: "#6c7174" },
  heritageBronze: { housing: "#5a4330", lens: "#f2c97a", trim: "#c9a25a", concrete: "#a29a8c" },
});

const p = assembly("park-pathway-bollard-light");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Concrete footing with anchor bolts.
add("footing", turned([[0, 0], [210, 0], [200, 60], [0, 60]]).color(concrete));
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 4;
  add(`anchor-bolt-${k}`, cylinder(24, 14, 6).translate(155 * Math.cos(a), 155 * Math.sin(a), 60).color(housing));
}

// Flared cast foot and fluted shaft.
add("foot", turned([[0, 60], [140, 60], [140, 90], [100, 150], [82, 230], [0, 230]]).color(housing));
add("shaft", cylinder(470, 72, 16).translate(0, 0, 230).color(housing));
for (let k = 0; k < 8; k++) {
  const a = (k * Math.PI) / 4;
  add(`flute-${k}`, cylinder(400, 12, 6).translate(74 * Math.cos(a), 74 * Math.sin(a), 265).color(housing));
}
add("band-lower", turned([[0, 240], [92, 240], [92, 262], [0, 262]]).color(trim));
add("band-upper", turned([[0, 668], [92, 668], [92, 690], [0, 690]]).color(trim));
add("head-collar", turned([[0, 690], [80, 690], [110, 720], [110, 740], [0, 740]]).color(housing));

// Glowing lens behind stacked down-throw louvres.
add("lens", cylinder(170, 90, 18).translate(0, 0, 740).color(lens));
for (let k = 0; k < 3; k++) {
  const z = 775 + k * 45;
  add(`louvre-${k}`, turned([[0, z], [106, z], [100, z + 12], [0, z + 12]]).color(housing));
}
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 4;
  add(`louvre-strut-${k}`, box(14, 14, 170, true).translate(96 * Math.cos(a), 96 * Math.sin(a), 825).color(housing));
}

// Overhanging domed cap and finial.
add("cap", turned([[0, 910], [150, 910], [150, 930], [120, 955], [70, 990], [0, 1000]]).color(housing));
add("finial-stem", cylinder(30, 14, 8).translate(0, 0, 995).color(trim));
add("finial", sphere(26).translate(0, 0, 1045).color(trim));

return p.model();
