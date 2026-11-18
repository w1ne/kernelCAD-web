// SPDX-License-Identifier: CC0-1.0
// Park entry arch: the themed gateway guests walk under when they enter the
// park, the landmark in every arrival photo.
// What makes it an entry arch rather than a portal frame: two tall towers on
// stone plinths with gilt bands, arched niches and onion domes topped by
// spires and pennant flags; an elliptical arch band springing between them
// with a keystone; and a framed welcome sign on the crown ringed with
// marquee bulbs.
// Generic visualization geometry at about real size (about 4.8 m wide,
// 5.3 m to the spire tips, 3.2 m clear walk-through under the crown),
// millimetres, Z up, guest face on -Y, standing on the plinths at z = 0.
meta({
  name: "park-entry-arch",
  license: "CC0-1.0",
  title: "Park entry arch",
  description: "Themed park entry arch at about real size: two towers on stone plinths with gilt bands, arched niches and onion domes topped by spires and pennant flags, an elliptical arch band with a keystone springing between them, and a framed welcome sign on the crown ringed with marquee bulbs. Material controls: masonry plinths, baked enamel towers and arch, gilt trim and bulbs, sign panel and flags. Festival, twilight and storybook presets.",
  tags: ["entry arch", "park entrance", "gateway", "welcome sign", "marquee", "onion dome", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 7000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const masonry = param("masonry", "#a49d8f", { label: "Stone plinths and keystone" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel towers and arch" });
const gilt = param("gilt", "#e0b04a", { label: "Gilt bands, domes and bulbs" });
const signPanel = param("signPanel", "#2f6fb8", { label: "Welcome sign panel and flags" });

presets({
  festival: { masonry: "#b8b0a0", enamel: "#e8d9b8", gilt: "#e3b54e", signPanel: "#c0392b" },
  twilight: { masonry: "#6f7477", enamel: "#385b81", gilt: "#c9a04a", signPanel: "#4a3f78" },
  storybook: { masonry: "#9b8f7e", enamel: "#f1e6d0", gilt: "#d9a7c7", signPanel: "#2f7d8a" },
});

const p = assembly("park-entry-arch");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 4 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const ellipse = (a: number, b: number, z0: number, n: number, from = 0, to = Math.PI) => {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = from + ((to - from) * k) / n;
    pts.push([a * Math.cos(t), z0 + b * Math.sin(t)]);
  }
  return pts;
};

const TX = 2050;
const TW = 560;
const PLINTH = 500;
const TOWER_TOP = 4100;
const SPRING = 2700;

// Two towers: plinth, body, gilt bands, niche, cornice, onion dome, spire, flag.
for (const sx of [-1, 1]) {
  const s = sx < 0 ? "l" : "r";
  const x = sx * TX;
  add(`plinth-${s}`, plan(rr(TW + 200, TW + 200, 30), 0, PLINTH).translate(x, 0, 0).color(masonry));
  add(`plinth-cap-${s}`, plan(rr(TW + 140, TW + 140, 30), PLINTH, 60).translate(x, 0, 0).color(masonry));
  const nicheShape = [[-130, 0], [130, 0], ...ellipse(130, 130, 1000, 6)];
  const niche = face(nicheShape, 80, -TW / 2 - 20).translate(x, 0, PLINTH + 500);
  add(`niche-back-${s}`, face(nicheShape, 12, -TW / 2 + 46).translate(x, 0, PLINTH + 500).color(signPanel));
  add(`tower-${s}`, plan(rr(TW, TW, 40), PLINTH + 60, TOWER_TOP - PLINTH - 60).translate(x, 0, 0).subtract(niche).color(enamel));
  for (const z of [PLINTH + 360, 2500, TOWER_TOP - 300])
    add(`band-${s}-${z}`, plan(rr(TW + 40, TW + 40, 50), z, 70).translate(x, 0, 0).color(gilt));
  add(`niche-star-${s}`, sphere(70).translate(x, -TW / 2 + 30, PLINTH + 1300).color(gilt));
  add(`cornice-${s}`, plan(rr(TW + 140, TW + 140, 60), TOWER_TOP, 90).translate(x, 0, 0).color(enamel));
  add(`drum-${s}`, cylinder(220, TW / 2 - 40, 20).translate(x, 0, TOWER_TOP + 90).color(enamel));
  add(`dome-${s}`, turned([[0, 0], [300, 0], [360, 120], [340, 260], [240, 400], [110, 520], [40, 620], [0, 640]]).translate(x, 0, TOWER_TOP + 310).color(gilt));
  add(`spire-${s}`, cylinder(420, 14, 8).translate(x, 0, TOWER_TOP + 940).color(gilt));
  add(`spire-ball-${s}`, sphere(40).translate(x, 0, TOWER_TOP + 1000).color(gilt));
  add(`flag-${s}`, face([[0, 0], [sx * 300, -70], [0, -150]], 10, -5).translate(x + sx * 15, 0, TOWER_TOP + 1340).color(signPanel));
}

// Elliptical arch band springing between the towers, with a keystone.
const IA = TX - TW / 2;
const band = [...ellipse(IA, 520, SPRING, 16), ...ellipse(IA + 120, 820, SPRING, 16).reverse()];
add("arch-band", face(band, 360, -180).color(enamel));
add("arch-trim", face([...ellipse(IA + 60, 560, SPRING, 16), ...ellipse(IA, 520, SPRING, 16).reverse()], 380, -190).color(gilt));
add("keystone", face([[-110, SPRING + 500], [110, SPRING + 500], [150, SPRING + 860], [-150, SPRING + 860]], 400, -200).color(masonry));

// Framed welcome sign on the crown, ringed with marquee bulbs.
const SW = 2200;
const SH = 620;
const SZ = SPRING + 1050;
add("sign-frame", extrudeRoundedRect(SW + 120, SH + 120, 120, 80, { axis: "y" }).translate(0, -260, SZ).color(gilt));
add("sign-panel", extrudeRoundedRect(SW, SH, 90, 40, { axis: "y" }).translate(0, -290, SZ).color(signPanel));
add("sign-stripe", extrudeRoundedRect(SW - 300, 90, 40, 20, { axis: "y" }).translate(0, -305, SZ - 120).color(gilt));
add("sign-star", extrudePolygon(Array.from({ length: 10 }, (_, k) => {
  const a = Math.PI / 2 + (k * Math.PI) / 5;
  const r = k % 2 === 0 ? 150 : 60;
  return [r * Math.cos(a), r * Math.sin(a)];
}), 20).rotateX(90).translate(0, -290, SZ + 110).color(gilt));
for (let k = 0; k < 9; k++) {
  const bx = -SW / 2 + 60 + (k * (SW - 120)) / 8;
  add(`bulb-top-${k}`, sphere(32).translate(bx, -265, SZ + SH / 2 + 30).color(gilt));
  add(`bulb-bottom-${k}`, sphere(32).translate(bx, -265, SZ - SH / 2 - 30).color(gilt));
}
for (const sx of [-1, 1])
  for (const dz of [-150, 0, 150]) add(`bulb-side-${sx < 0 ? "l" : "r"}-${dz}`, sphere(32).translate(sx * (SW / 2 + 30), -265, SZ + dz).color(gilt));
for (const sx of [-1, 1]) add(`sign-post-${sx < 0 ? "l" : "r"}`, box(80, 80, 400, true).translate(sx * 700, -100, SPRING + 800).color(enamel));

return p.model();
