// SPDX-License-Identifier: CC0-1.0
// Family plaza shade pavilion: the open-sided gable shelter on a park plaza
// where families sit out of the sun between rides.
// What makes it a shade pavilion rather than a box: four square steel posts on
// concrete pier footings with knee braces, eave beams and tie beams, a striped
// canvas gable roof pitched over a ridge, scalloped valance flaps hanging off
// both eaves, a ridge mast with a ball finial and pennant, and two slatted
// benches underneath facing each other.
// Generic visualization geometry at about real size (about 3.4 m long, 2.6 m
// deep, 4 m to the finial), millimetres, Z up, ridge along X, standing on
// z = 0.
meta({
  name: "family-plaza-shade-pavilion",
  license: "CC0-1.0",
  title: "Family plaza shade pavilion",
  description: "Open-sided plaza shade pavilion at about real size: four square steel posts on concrete pier footings with knee braces, eave and tie beams, a striped canvas gable roof with scalloped valance flaps on both eaves, a ridge mast with ball finial and pennant, and two slatted benches underneath. Material controls: painted steel, canvas, canvas stripe, concrete and timber. Seaside, festival and twilight presets.",
  tags: ["pavilion", "shade structure", "gazebo", "canopy", "shelter", "bench", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 5000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#e8e6df", { label: "Painted steel frame" });
const canvas = param("canvas", "#f4efe0", { label: "Canvas" });
const stripe = param("stripe", "#2f8fb0", { label: "Canvas stripe and valance" });
const concrete = param("concrete", "#9a978d", { label: "Concrete footings and bench timber" });

presets({
  seaside: { steel: "#e8e6df", canvas: "#f4efe0", stripe: "#2f8fb0", concrete: "#9a978d" },
  festival: { steel: "#f0d9a2", canvas: "#fff6e2", stripe: "#d24b3e", concrete: "#a8a294" },
  twilight: { steel: "#3f525d", canvas: "#d9cfb8", stripe: "#3d4f8a", concrete: "#6f7477" },
});

const p = assembly("family-plaza-shade-pavilion");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const PX = 1450;
const PY = 1050;
const EAVE = 2450;
const RIDGE = 3150;
const HALF = 1300;
const ROOF_L = 3400;

// Pier footings, posts and knee braces.
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    const n = `${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`;
    add(`footing-${n}`, cylinder(120, 200, 12).translate(sx * PX, sy * PY, 0).color(concrete));
    add(`base-plate-${n}`, box(220, 220, 16, true).translate(sx * PX, sy * PY, 128).color(steel));
    add(`post-${n}`, box(110, 110, EAVE - 136, true).translate(sx * PX, sy * PY, 136 + (EAVE - 136) / 2).color(steel));
    add(`brace-x-${n}`, box(420, 60, 60, true).rotateY(sx * 45).translate(sx * (PX - 150), sy * PY, EAVE - 200).color(steel));
    add(`brace-y-${n}`, box(60, 420, 60, true).rotateX(-sy * 45).translate(sx * PX, sy * (PY - 150), EAVE - 200).color(steel));
  }
}
for (const sy of [-1, 1]) add(`eave-beam-${sy > 0 ? "b" : "f"}`, box(2 * PX + 220, 120, 140, true).translate(0, sy * PY, EAVE + 70).color(steel));
for (const sx of [-1, 1]) add(`tie-beam-${sx > 0 ? "r" : "l"}`, box(120, 2 * PY + 220, 140, true).translate(sx * PX, 0, EAVE + 70).color(steel));

// Striped canvas gable roof: alternating bands along the ridge.
const T = 40;
const roofProfile: [number, number][] = [[-HALF, EAVE + 100], [0, RIDGE], [HALF, EAVE + 100], [HALF, EAVE + 100 - T], [0, RIDGE - T], [-HALF, EAVE + 100 - T]];
const BANDS = 7;
const bw = ROOF_L / BANDS;
for (let k = 0; k < BANDS; k++) {
  const x = -ROOF_L / 2 + bw * (k + 0.5);
  add(`roof-band-${k}`, profileYZ(roofProfile, bw).translate(x, 0, 0).color(k % 2 === 0 ? stripe : canvas));
}
add("ridge-cap", cylinder(ROOF_L + 60, 45, 10).rotateY(90).translate(-ROOF_L / 2 - 30, 0, RIDGE).color(steel));
for (const sx of [-1, 1]) add(`gable-trim-${sx > 0 ? "r" : "l"}`, profileYZ([[-HALF - 20, EAVE + 60], [0, RIDGE + 30], [HALF + 20, EAVE + 60], [HALF + 20, EAVE + 20], [0, RIDGE - 20], [-HALF - 20, EAVE + 20]], 30).translate(sx * (ROOF_L / 2 + 15), 0, 0).color(steel));

// Scalloped valance flaps hanging from both eaves.
const FLAPS = 10;
const fw = ROOF_L / FLAPS;
for (const sy of [-1, 1]) {
  for (let k = 0; k < FLAPS; k++) {
    const x = -ROOF_L / 2 + fw * (k + 0.5);
    const flap = extrudePolygon([[-fw / 2, 0], [fw / 2, 0], [fw / 2, -120], [fw / 4, -200], [0, -220], [-fw / 4, -200], [-fw / 2, -120]], 12).rotateX(90);
    add(`valance-${sy > 0 ? "b" : "f"}-${k}`, flap.translate(x, sy * (HALF + 10) + 6, EAVE + 100).color(k % 2 === 0 ? canvas : stripe));
  }
}

// Ridge mast with ball finial and pennant.
add("mast", cylinder(700, 30, 10).translate(0, 0, RIDGE).color(steel));
add("finial", sphere(70).translate(0, 0, RIDGE + 740).color(stripe));
add("pennant", extrudePolygon([[0, 0], [420, -90], [0, -180]], 10).rotateX(90).translate(30, 5, RIDGE + 680).color(stripe));

// Two slatted benches facing each other.
for (const sy of [-1, 1]) {
  const s = sy > 0 ? "b" : "f";
  const y = sy * 560;
  for (const lx of [-800, 800]) add(`bench-leg-${s}-${lx > 0 ? "r" : "l"}`, box(60, 380, 420, true).translate(lx, y, 210).color(steel));
  for (let k = 0; k < 3; k++) add(`bench-slat-${s}-${k}`, box(2000, 100, 40, true).translate(0, y + (k - 1) * 120, 440).color(concrete));
  add(`bench-back-${s}`, box(2000, 40, 220, true).translate(0, y + sy * 200, 640).color(concrete));
  for (const lx of [-800, 800]) add(`bench-back-post-${s}-${lx > 0 ? "r" : "l"}`, box(60, 40, 300, true).translate(lx, y + sy * 200, 570).color(steel));
}

return p.model();
