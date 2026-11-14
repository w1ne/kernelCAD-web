// SPDX-License-Identifier: CC0-1.0
// Picnic table with umbrella: the plank table with built-in benches that
// families eat at in the food-court lawn, shaded by a market umbrella.
// What makes it a park picnic table rather than a slab: a tabletop and two
// bench seats built from spaced timber planks, splayed steel A-frame legs
// at each end tied by a bench beam and a top cleat, and a market umbrella
// whose mast drops through the centre into a weighted base, carrying an
// eight-panel striped canopy on ribs with a scalloped valance and a finial.
// Generic visualization geometry at about real size (1.8 m long, 1.6 m over
// the benches, 2.4 m canopy, 2.5 m to the finial), millimetres, Z up, long
// side facing -Y, standing on the leg feet at z = 0.
meta({
  name: "picnic-table-with-umbrella",
  license: "CC0-1.0",
  title: "Picnic table with umbrella",
  description: "Park picnic table with umbrella at about real size: spaced timber plank tabletop and bench seats, splayed steel A-frame legs with bench beams and top cleats, and a market umbrella with a mast through the table into a weighted base, an eight-panel striped canopy on ribs, a scalloped valance and a finial. Material controls: sealed timber, painted steel, canvas and canvas stripe. Festival, twilight and seaside presets.",
  tags: ["picnic table", "picnic bench", "umbrella", "parasol", "shade", "outdoor dining", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#9a7148", { label: "Sealed timber planks" });
const steel = param("steel", "#3d4a52", { label: "Painted steel frame and mast" });
const canvas = param("canvas", "#efe6cf", { label: "Canopy canvas" });
const stripe = param("stripe", "#c0392b", { label: "Canopy stripe and valance" });

presets({
  festival: { timber: "#b88a56", steel: "#2f6fb8", canvas: "#f4ead2", stripe: "#e0a033" },
  twilight: { timber: "#7a5a3e", steel: "#2a2f45", canvas: "#c9b8e0", stripe: "#4a3f78" },
  seaside: { timber: "#b9a585", steel: "#e8ece9", canvas: "#ffffff", stripe: "#2f78b8" },
});

const p = assembly("picnic-table-with-umbrella");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// A square bar from a to b, both in the plane x = const.
const barYZ = (x: number, a: [number, number], b: [number, number], w: number) => {
  const dy = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.sqrt(dy * dy + dz * dz);
  return box(w, w, len).translate(-w / 2, -w / 2, 0).rotateX((-Math.atan2(dy, dz) * 180) / Math.PI).translate(x, a[0], a[1]);
};

const L = 1800;
const TOP = 760;
const SEAT = 450;
const LEG_X = [-620, 620];

// Tabletop: five spaced planks with a hole for the mast.
for (let k = 0; k < 5; k++) {
  let plank = box(L, 150, 40, true).translate(0, -330 + k * 165, TOP - 20);
  if (k === 2) plank = plank.subtract(cylinder(60, 34, 12).translate(0, 0, TOP - 50));
  add(`top-plank-${k}`, plank.color(timber));
}
// Bench seats: two planks each side.
for (const sy of [-1, 1])
  for (let k = 0; k < 2; k++)
    add(`seat-plank-${sy < 0 ? "f" : "b"}-${k}`, box(L, 130, 40, true).translate(0, sy * (610 + k * 145), SEAT - 20).color(timber));

// Steel A-frame ends: splayed legs, bench beam, top cleat, feet.
for (const [i, x] of LEG_X.entries()) {
  for (const sy of [-1, 1]) {
    add(`leg-${i}-${sy < 0 ? "f" : "b"}`, barYZ(x, [sy * 640, 30], [sy * 170, TOP - 40], 50).color(steel));
    add(`foot-${i}-${sy < 0 ? "f" : "b"}`, box(90, 130, 40, true).translate(x, sy * 650, 20).color(steel));
  }
  add(`bench-beam-${i}`, box(60, 1640, 50, true).translate(x, 0, SEAT - 65).color(steel));
  add(`top-cleat-${i}`, box(60, 760, 40, true).translate(x, 0, TOP - 60).color(steel));
}
add("brace", box(L - 200, 40, 40, true).translate(0, 0, SEAT - 65).color(steel));

// Umbrella mast through the table into a weighted base.
const EAVE = 2080;
const RISE = 380;
const R = 1200;
add("base-weight", cylinder(70, 260, 20).color(steel));
add("mast", cylinder(EAVE + RISE - 50, 22, 12).translate(0, 0, 50).color(steel));
add("runner", cylinder(120, 36, 12).translate(0, 0, EAVE - 460).color(steel));
add("tilt-collar", cylinder(60, 30, 12).translate(0, 0, TOP + 200).color(steel));

// Eight-panel striped canopy on ribs, with a scalloped valance.
const HB = R * Math.sin(Math.PI / 8);
const A = R * Math.cos(Math.PI / 8);
const slant = Math.sqrt(A * A + RISE * RISE);
const tilt = (Math.atan2(A, RISE) * 180) / Math.PI;
const scallops = [[-HB, 0], [HB, 0]];
const ns = 3;
const sw = (2 * HB) / ns;
for (let i = ns - 1; i >= 0; i--) {
  const xc = -HB + sw * (i + 0.5);
  for (let k = 1; k < 6; k++) scallops.push([xc + (sw / 2) * Math.cos((k * Math.PI) / 6), -110 * Math.sin((k * Math.PI) / 6)]);
  if (i > 0) scallops.push([xc - sw / 2, 0]);
}
const ribTilt = (Math.atan2(R, RISE) * 180) / Math.PI;
const ribLen = Math.sqrt(R * R + RISE * RISE);
// Stretchers run from the runner up to the middle of each rib.
const SR = 560;
const SZ = RISE * (1 - SR / R) - 20 + 400;
for (let k = 0; k < 8; k++) {
  const c = k % 2 === 0 ? stripe : canvas;
  const panel = face([[-HB, 0], [HB, 0], [0, slant]], 14, -7).rotateX(-tilt).translate(0, -A, 0);
  add(`canopy-panel-${k}`, panel.rotateZ(k * 45).translate(0, 0, EAVE).color(c));
  add(`valance-${k}`, face(scallops, 8, -A - 8).rotateZ(k * 45).translate(0, 0, EAVE).color(k % 2 === 0 ? canvas : stripe));
  add(`rib-${k}`, cylinder(ribLen, 9, 6).rotateX(-ribTilt).translate(0, -R, -20).rotateZ(k * 45 + 22.5).translate(0, 0, EAVE).color(steel));
  add(`rib-tip-${k}`, sphere(18).translate(0, -R, -10).rotateZ(k * 45 + 22.5).translate(0, 0, EAVE).color(steel));
  add(`stretcher-${k}`, cylinder(Math.sqrt(SR * SR + SZ * SZ), 7, 6).rotateX((Math.atan2(SR, SZ) * 180) / Math.PI).rotateZ(k * 45 + 22.5).translate(0, 0, EAVE - 400).color(steel));
}
add("finial", sphere(50).translate(0, 0, EAVE + RISE + 30).color(stripe));

return p.model();
