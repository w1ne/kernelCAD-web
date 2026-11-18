// SPDX-License-Identifier: CC0-1.0
// Pretzel warmer counter: the midway snack counter that sells soft pretzels
// straight out of a heated glass case.
// What makes it a pretzel counter rather than any food counter: an open-top
// heated merchandiser with a low curved sneeze glass, stainless end cheeks
// and a heat-lamp hood, holding two shelves of knotted soft pretzels; a big pretzel sign on
// a mast above the counter so it can be seen down the midway; an enamel
// counter body with a pretzel emblem and a stainless kick plate; two
// pump jugs for cheese and mustard dip; and a small cash register.
// Generic visualization geometry at about real size (about 1.7 m wide,
// 0.9 m deep, 2.45 m to the sign), millimetres, Z up, service side facing
// -Y, standing on z = 0.
meta({
  name: "pretzel-warmer-counter",
  license: "CC0-1.0",
  title: "Pretzel warmer counter",
  description: "Midway soft-pretzel counter at about real size: open-top heated merchandiser with a low curved sneeze glass, stainless end cheeks and a heat-lamp hood holding two shelves of knotted pretzels, a big pretzel sign on a mast, an enamel counter body with a pretzel emblem and stainless kick plate and worktop, cheese and mustard pump jugs, and a small cash register. Material controls: stainless steel, baked enamel, tinted glass, baked pretzel dough. Festival, twilight and bakery presets.",
  tags: ["pretzel", "soft pretzel", "food counter", "warmer", "display case", "concession", "snack stand", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 8500,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless worktop, case and fittings" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel counter body and sign disc" });
const glass = param("glass", "#9fd3d8", { label: "Tinted display glass" });
const bakedDough = param("bakedDough", "#a8642a", { label: "Baked pretzel dough" });

presets({
  festival: { stainlessSteel: "#d1d1c6", enamel: "#2f6fb0", glass: "#a9dfe6", bakedDough: "#b8722e" },
  twilight: { stainlessSteel: "#788b91", enamel: "#35576f", glass: "#4f8597", bakedDough: "#8a5225" },
  bakery: { stainlessSteel: "#c9b98f", enamel: "#2f5a3c", glass: "#c8e2d0", bakedDough: "#c07a35" },
});

const p = assembly("pretzel-warmer-counter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);

// A knotted pretzel lying flat in XY: one wide bottom loop and two upper
// lobes, centred on the origin and sized by s (about 2 * 75 * s across).
// Returned as three overlapping rings: a union would add many triangles.
const pretzel = (s: number, seg = 10) => [
  torus(55 * s, 13 * s, seg).translate(0, -15 * s, 0),
  torus(32 * s, 12 * s, seg).translate(-30 * s, 28 * s, 0),
  torus(32 * s, 12 * s, seg).translate(30 * s, 28 * s, 0),
];

const W = 1640;
const D = 820;
const TOP = 900;

// Counter body: kick plate, enamel body, front emblem and stainless worktop.
add("kick-plate", box(W - 40, D - 40, 100, true).translate(0, 0, 50).color(stainlessSteel));
add("counter-body", box(W, D, TOP - 140, true).translate(0, 0, 100 + (TOP - 140) / 2).color(enamel));
add("worktop", box(W + 60, D + 60, 40, true).translate(0, 0, TOP - 20).color(stainlessSteel));
add("worktop-edge", box(W + 60, 20, 60, true).translate(0, -D / 2 - 40, TOP - 30).color(stainlessSteel));
add("emblem-disc", cylinder(12, 230, 24).rotateX(90).translate(0, -D / 2, 480).color(stainlessSteel));
for (const [j, ring] of pretzel(2.4, 12).entries()) add(`emblem-pretzel-${j}`, ring.rotateX(90).translate(0, -D / 2 - 30, 470).color(bakedDough));
for (const sx of [-1, 1]) add(`body-trim-${sx > 0 ? "r" : "l"}`, box(30, 20, TOP - 140, true).translate(sx * (W / 2 - 15), -D / 2 - 10, 100 + (TOP - 140) / 2).color(stainlessSteel));

// Heated display case on the worktop: base, end cheeks, back glass,
// curved front glass, two shelves and a lamp hood.
const CW = 1100;
const CX = -120;
const C0 = TOP;
const CY0 = -300;
const CY1 = 300;
const CH = 620;
const caseAt = (s: Shape) => s.translate(CX, 0, 0);
add("case-base", caseAt(box(CW, CY1 - CY0, 90, true).translate(0, 0, C0 + 45)).color(stainlessSteel));
const curve: [number, number][] = [];
for (let i = 0; i <= 6; i++) {
  const a = (Math.PI / 2) * (i / 6);
  curve.push([CY0 + 200 - 200 * Math.cos(a), C0 + 90 + 190 * Math.sin(a)]);
}
const glassInner = curve.slice().reverse().map(([y, z]) => [y + 14, z - 6]);
add("front-glass", caseAt(longSide([...curve, ...glassInner], CW - 40)).color(glass));
add("back-glass", caseAt(box(CW - 40, 12, CH - 90, true).translate(0, CY1 - 20, C0 + 90 + (CH - 90) / 2)).color(glass));
for (const sx of [-1, 1]) {
  add(`end-cheek-${sx > 0 ? "r" : "l"}`, caseAt(longSide([[CY0, C0], [CY1, C0], [CY1, C0 + CH + 20], [-20, C0 + CH + 20], [CY0 + 200, C0 + 280], [CY0, C0 + 230]], 30).translate(sx * (CW / 2 - 15), 0, 0)).color(stainlessSteel));
}
add("lamp-hood", caseAt(longSide([[-40, C0 + CH], [CY1 + 10, C0 + CH], [CY1 + 10, C0 + CH + 60], [-20, C0 + CH + 60]], CW + 20)).color(stainlessSteel));
add("lamp-strip", caseAt(box(CW - 80, 40, 14, true).translate(0, 120, C0 + CH - 8)).color(bakedDough));
const SHELVES = [C0 + 110, C0 + 340];
for (const [k, z] of SHELVES.entries()) {
  add(`shelf-${k}`, caseAt(box(CW - 60, k ? 380 : 480, 12, true).translate(0, k ? 90 : 20, z)).color(stainlessSteel));
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = -CW / 2 + 140 + (i * (CW - 280)) / (n - 1);
    for (const [j, ring] of pretzel(1, 8).entries()) add(`pretzel-${k}-${i}-${j}`, caseAt(ring.rotateZ(i % 2 ? 10 : -10).rotateX(35).translate(x, k ? 110 : 40, z + 50)).color(bakedDough));
  }
}

// Cheese and mustard pump jugs, and a small cash register.
for (const [i, x] of [560, 700].entries()) {
  add(`pump-jug-${i}`, cylinder(220, 55, 14).translate(x, -120, TOP).color(stainlessSteel));
  add(`pump-lid-${i}`, cylinder(20, 60, 14).translate(x, -120, TOP + 220).color(enamel));
  add(`pump-stem-${i}`, cylinder(90, 10, 8).translate(x, -120, TOP + 240).color(stainlessSteel));
  add(`pump-nozzle-${i}`, cylinder(70, 10, 8).rotateX(90).translate(x, -120, TOP + 320).color(stainlessSteel));
  add(`pump-head-${i}`, box(40, 90, 26, true).translate(x, -150, TOP + 335).color(i ? bakedDough : enamel));
}
add("register-body", front([[530, TOP], [770, TOP], [770, TOP + 120], [530, TOP + 80]], 260, 60).color(stainlessSteel));
add("register-screen", box(200, 20, 120, true).rotateX(-20).translate(650, 300, TOP + 200).color(glass));
add("register-post", cylinder(80, 15, 8).translate(650, 300, TOP + 100).color(stainlessSteel));

// Big pretzel sign on a mast behind the case.
const SX = CX;
const SZ = 2150;
add("sign-mast", cylinder(SZ - TOP - 200, 30, 12).translate(SX, CY1 + 60, TOP).color(stainlessSteel));
add("sign-disc", cylinder(30, 300, 28).rotateX(90).translate(SX, CY1 + 75, SZ).color(enamel));
add("sign-ring", torus(300, 20, 28).rotateX(90).translate(SX, CY1 + 60, SZ).color(stainlessSteel));
for (const [j, ring] of pretzel(3.2, 12).entries()) add(`sign-pretzel-${j}`, ring.rotateX(90).translate(SX, CY1 + 25, SZ - 10).color(bakedDough));

return p.model();
