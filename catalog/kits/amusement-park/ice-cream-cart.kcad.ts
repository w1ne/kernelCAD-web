// SPDX-License-Identifier: CC0-1.0
// Ice cream cart: the push cart a vendor wheels along the midway, scooping
// from tubs in its chilled chest.
// What makes it an ice cream cart rather than a generic barrow: a rounded
// enamel cabinet on two big spoked wheels at one end and stand legs at the
// other, with a push bar; a stainless chest top with domed lids over the
// dipping wells, one standing open on a tub of ice cream; a coloured band
// with a cone-and-scoop emblem on the guest face; and a striped parasol on
// a pole with a ball finial.
// Generic visualization geometry at about real size (about 1.9 m long with
// the push bar, 1 m wide over the wheels, 2.3 m to the parasol top),
// millimetres, Z up, guest face on -Y, standing on z = 0.
meta({
  name: "ice-cream-cart",
  license: "CC0-1.0",
  title: "Ice cream cart",
  description: "Midway ice cream push cart at about real size: rounded enamel cabinet on two big spoked wheels and stand legs with a push bar, a stainless chest top with domed dipping-well lids and one open tub, a coloured band with a cone-and-scoop emblem, and a striped parasol with a ball finial. Material controls: enamel cabinet, parasol and band colour, stainless steel, rubber tyres. Festival, twilight and safety presets.",
  tags: ["ice cream cart", "push cart", "concession", "parasol", "vending cart", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 5000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enamel = param("enamel", "#f4ecd8", { label: "Enamel cabinet and parasol panels" });
const canopy = param("canopy", "#e0607e", { label: "Parasol stripe, band and ice cream" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless chest, lids and frame" });
const rubber = param("rubber", "#292f33", { label: "Rubber tyres and feet" });

presets({
  festival: { enamel: "#fff4dc", canopy: "#3f9bd8", stainlessSteel: "#d1d1c6", rubber: "#3c4245" },
  twilight: { enamel: "#c9c3d8", canopy: "#6a4c93", stainlessSteel: "#788b91", rubber: "#20262a" },
  mint: { enamel: "#f2f6ee", canopy: "#5fc4a0", stainlessSteel: "#c3cbc8", rubber: "#2b2f33" },
});

const p = assembly("ice-cream-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const turned = (pts, angleDeg?: number) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return angleDeg ? pb.close().revolve({ angleDeg }) : pb.close().revolve();
};

const BL = 1300;
const BW = 720;
const Z0 = 430;
const TOP = 1000;

// Cabinet, coloured band with emblem, and stainless chest top.
add("cabinet", plan(rr(BL, BW, 160), Z0, TOP - Z0).color(enamel));
add("cabinet-skirt", plan(rr(BL + 20, BW + 20, 165), Z0, 40).color(stainlessSteel));
add("band", plan(rr(BL + 16, BW + 16, 165), 720, 150).color(canopy));
add("emblem-disc", cylinder(14, 150, 24).rotateX(90).translate(0, -BW / 2 - 6, 640).color(enamel));
add("emblem-cone", face([[-55, 690], [55, 690], [0, 530]], 10, -BW / 2 - 24).color(rubber));
add("emblem-scoop", sphere(62).scale([1, 0.25, 1]).translate(0, -BW / 2 - 22, 715).color(canopy));
add("chest-top", plan(rr(BL + 40, BW + 40, 170), TOP, 40).color(stainlessSteel));

// Dipping wells: two domed lids and one open well with a tub of ice cream.
const WELLS = [-380, 0, 380];
WELLS.forEach((x, i) => {
  add(`well-rim-${i}`, cylinder(20, 170, 20).translate(x, -40, TOP + 40).color(stainlessSteel));
  if (i === 2) {
    add("open-tub-cream", sphere(150).scale([1, 1, 0.45]).translate(x, -40, TOP + 60).color(canopy));
    add("open-lid", turned([[0, 0], [160, 0], [150, 30], [100, 60], [0, 75]]).rotateX(-100).translate(x, 135, TOP + 70).color(stainlessSteel));
    add("scoop", cylinder(220, 10, 8).rotateY(60).translate(x + 40, -40, TOP + 110).color(stainlessSteel));
  } else {
    add(`lid-${i}`, turned([[0, 0], [160, 0], [150, 30], [100, 60], [0, 75]]).translate(x, -40, TOP + 60).color(stainlessSteel));
    add(`lid-knob-${i}`, sphere(26).translate(x, -40, TOP + 140).color(rubber));
  }
});

// Two big spoked wheels at -X, stand legs and push bar at +X.
const WX = -360;
const WR = 380;
for (const sy of [-1, 1]) {
  const y = sy * (BW / 2 + 70);
  const s = sy > 0 ? "b" : "f";
  add(`tyre-${s}`, torus(WR - 30, 30, 28).rotateX(90).translate(WX, y, WR).color(rubber));
  add(`rim-${s}`, torus(WR - 62, 12, 28).rotateX(90).translate(WX, y, WR).color(stainlessSteel));
  add(`hub-${s}`, cylinder(70, 55, 16).rotateX(90).translate(WX, y + 35, WR).color(enamel));
  for (let k = 0; k < 6; k++) add(`spoke-${s}-${k}`, box(2 * (WR - 60), 14, 22, true).rotateY(k * 30).translate(WX, y, WR).color(stainlessSteel));
}
add("axle", cylinder(BW + 140, 20, 10).rotateX(90).translate(WX, BW / 2 + 70, WR).color(stainlessSteel));
for (const sy of [-1, 1]) {
  const s = sy > 0 ? "b" : "f";
  add(`stand-leg-${s}`, cylinder(Z0 - 20, 22, 10).translate(BL / 2 - 140, sy * (BW / 2 - 80), 20).color(stainlessSteel));
  add(`stand-foot-${s}`, cylinder(20, 40, 12).translate(BL / 2 - 140, sy * (BW / 2 - 80), 0).color(rubber));
  add(`push-arm-${s}`, cylinder(380, 20, 10).rotateY(70).translate(BL / 2 - 40, sy * (BW / 2 - 60), 900).color(stainlessSteel));
}
add("push-bar", cylinder(BW - 60, 24, 12).rotateX(90).translate(BL / 2 + 320, BW / 2 - 30, 1030).color(stainlessSteel));
add("push-grip", cylinder(BW - 260, 30, 12).rotateX(90).translate(BL / 2 + 320, BW / 2 - 130, 1030).color(rubber));

// Striped parasol on a pole with a ball finial.
const PX = -150;
const PY = 180;
add("parasol-pole", cylinder(1300, 22, 10).translate(PX, PY, TOP + 40).color(stainlessSteel));
const SEG = 8;
for (let k = 0; k < SEG; k++) {
  const panel = turned([[0, 2330], [950, 2020], [950, 1985], [0, 2300]], 360 / SEG).rotateZ((k * 360) / SEG);
  add(`parasol-panel-${k}`, panel.translate(PX, PY, 0).color(k % 2 === 0 ? canopy : enamel));
}
add("parasol-finial", sphere(45).translate(PX, PY, 2370).color(canopy));

return p.model();
