// SPDX-License-Identifier: CC0-1.0
// Lemonade dispenser cart: the wooden wagon stand that pours fresh lemonade
// from big glass jars on the midway.
// What makes it a lemonade cart rather than a generic counter: two shouldered
// dispenser jars full of lemonade with front taps; a bowl of lemons and a
// lidded ice chest on a plank counter; a timber wagon body with a big lemon
// slice emblem on four spoked wagon wheels with iron tyres; and a striped
// awning on four posts with a pennant valance.
// Generic visualization geometry at about real size (about 2 m long with the
// handle, 1.1 m wide over the wheels, 2.3 m to the awning top), millimetres,
// Z up, guest face on -Y, standing on z = 0.
meta({
  name: "lemonade-dispenser-cart",
  license: "CC0-1.0",
  title: "Lemonade dispenser cart",
  description: "Wooden lemonade wagon stand at about real size: two shouldered dispenser jars of lemonade with front taps, a bowl of lemons, a lidded ice chest and a stack of cups on a plank counter, a timber wagon body with a lemon-slice emblem on four spoked wagon wheels with iron tyres, a pull handle, and a striped awning on four posts with a pennant valance. Material controls: timber, lemonade, stainless steel, canvas. Festival, twilight and pink-lemonade presets.",
  tags: ["lemonade cart", "lemonade stand", "drink dispenser", "beverage cart", "wagon", "awning", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 8000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#b9844f", { label: "Painted timber wagon and wheels" });
const lemonade = param("lemonade", "#f2cf3a", { label: "Lemonade, lemons and awning stripe" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless taps, lids and iron tyres" });
const canvas = param("canvas", "#f6f1e3", { label: "Canvas awning stripe, cups and slice pith" });

presets({
  festival: { timber: "#3f9bd8", lemonade: "#f4d548", stainlessSteel: "#d1d1c6", canvas: "#fff8e8" },
  twilight: { timber: "#5b4a6e", lemonade: "#e5c04a", stainlessSteel: "#788b91", canvas: "#d9d3e6" },
  pinkLemonade: { timber: "#f2f0ea", lemonade: "#f08aa6", stainlessSteel: "#c3cbc8", canvas: "#fff6f8" },
});

const p = assembly("lemonade-dispenser-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const L = 1500;
const Wd = 800;
const FRONT = -Wd / 2;
const Z0 = 440;
const TOP = 960;

// Timber wagon body with corner stiles, stainless bands and the lemon slice.
add("wagon-body", plan(rr(L, Wd, 30), Z0, TOP - Z0).color(timber));
for (const z of [Z0, TOP - 40]) add(`body-band-${z}`, plan(rr(L + 16, Wd + 16, 34), z, 30).color(stainlessSteel));
for (const x of [-L / 2 + 40, L / 2 - 40]) add(`stile-${x < 0 ? "l" : "r"}`, face([[x - 40, Z0], [x + 40, Z0], [x + 40, TOP], [x - 40, TOP]], 20, FRONT - 20).color(timber));
add("slice-rind", cylinder(14, 190, 28).rotateX(90).translate(0, FRONT, 700).color(lemonade));
add("slice-pith", cylinder(10, 165, 28).rotateX(90).translate(0, FRONT - 14, 700).color(canvas));
add("slice-flesh", cylinder(8, 150, 28).rotateX(90).translate(0, FRONT - 24, 700).color(lemonade));
for (let k = 0; k < 4; k++) add(`slice-segment-${k}`, box(300, 10, 14, true).rotateY(k * 45).translate(0, FRONT - 36, 700).color(canvas));
add("counter", plan(rr(L + 80, Wd + 60, 30), TOP, 40).color(timber));

// Two shouldered dispenser jars of lemonade with stainless lids, stands and taps.
const JAR = [[0, 0], [210, 0], [225, 30], [225, 430], [180, 500], [110, 525], [0, 525]];
for (const [k, x] of [-430, 160].entries()) {
  add(`jar-stand-${k}`, cylinder(90, 170, 20).translate(x, 40, TOP + 40).color(stainlessSteel));
  add(`jar-${k}`, turned(JAR).translate(x, 40, TOP + 130).color(lemonade));
  add(`jar-lid-${k}`, turned([[0, 0], [125, 0], [110, 40], [40, 70], [30, 110], [0, 115]]).translate(x, 40, TOP + 650).color(stainlessSteel));
  add(`tap-spout-${k}`, cylinder(110, 22, 10).rotateX(90).translate(x, -170, TOP + 180).color(stainlessSteel));
  add(`tap-nozzle-${k}`, cylinder(50, 16, 8).translate(x, -265, TOP + 130).color(stainlessSteel));
  add(`tap-lever-${k}`, box(26, 26, 110, true).rotateX(-20).translate(x, -260, TOP + 245).color(timber));
  for (const [s, z] of [TOP + 330, TOP + 470].entries()) add(`jar-lemon-${k}-${s}`, cylinder(10, 70, 16).rotateX(80).translate(x + (s ? -60 : 70), -178, z).color(canvas));
}

// Bowl of lemons, ice chest and a stack of cups.
add("lemon-bowl", turned([[0, 0], [90, 0], [190, 110], [175, 115], [80, 15], [0, 15]]).translate(-130, -200, TOP + 40).color(stainlessSteel));
[[-180, -230], [-80, -230], [-130, -150], [-60, -170], [-200, -160], [-130, -210]].forEach(([x, y], i) =>
  add(`lemon-${i}`, sphere(55).scale([1.3, 1, 1]).rotateZ(i * 30).translate(x, y, TOP + 120 + (i === 5 ? 70 : 0)).color(lemonade)),
);
add("ice-chest", plan(rr(380, 300, 30), TOP + 40, 230).translate(530, 150, 0).color(canvas));
add("ice-chest-lid", plan(rr(400, 320, 34), TOP + 270, 40).translate(530, 150, 0).color(stainlessSteel));
add("cup-stack", turned([[0, 0], [40, 0], [55, 320], [0, 320]]).translate(560, -230, TOP + 40).color(canvas));
add("cup-stack-2", turned([[0, 0], [40, 0], [55, 260], [0, 260]]).translate(680, -230, TOP + 40).color(canvas));

// Four spoked wagon wheels with iron tyres, and a pull handle at +X.
const WR = 290;
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) {
    const x = sx * (L / 2 - 260);
    const y = sy * (Wd / 2 + 60);
    const s = `${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`;
    add(`tyre-${s}`, torus(WR - 22, 22, 24).rotateX(90).translate(x, y, WR).color(stainlessSteel));
    add(`felloe-${s}`, torus(WR - 58, 18, 24).rotateX(90).translate(x, y, WR).color(timber));
    add(`hub-${s}`, cylinder(90, 55, 14).rotateX(90).translate(x, y + 45, WR).color(timber));
    for (let k = 0; k < 4; k++) add(`spoke-${s}-${k}`, box(2 * (WR - 60), 20, 30, true).rotateY(k * 45).translate(x, y, WR).color(timber));
  }
for (const sx of [-1, 1]) add(`axle-${sx > 0 ? "r" : "l"}`, cylinder(Wd + 120, 20, 10).rotateX(90).translate(sx * (L / 2 - 260), Wd / 2 + 60, WR).color(stainlessSteel));
add("pull-handle", cylinder(520, 22, 10).rotateY(70).translate(L / 2, 0, 520).color(timber));
add("pull-grip", cylinder(360, 26, 12).rotateX(90).translate(L / 2 + 490, 180, 698).color(stainlessSteel));

// Striped awning on four posts with a pennant valance on the guest side.
const AX = L / 2 + 20;
const AY = Wd / 2 + 20;
const EAVE = 2150;
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) add(`awning-post-${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`, cylinder(EAVE - TOP - 40, 18, 10).translate(sx * (AX - 30), sy * (AY - 30), TOP + 40).color(stainlessSteel));
const STRIPES = 8;
const sw = (2 * AX + 120) / STRIPES;
for (let k = 0; k < STRIPES; k++) {
  const x = -AX - 60 + sw * (k + 0.5);
  add(`awning-stripe-${k}`, box(sw, 2 * AY + 160, 24, true).rotateX(7).translate(x, 0, EAVE + 100).color(k % 2 === 0 ? lemonade : canvas));
}
const FY = -AY - 80;
for (let k = 0; k < STRIPES; k++) {
  const x = -AX - 60 + sw * k;
  add(`pennant-${k}`, face([[x, 0], [x + sw, 0], [x + sw / 2, -170]], 10, FY).translate(0, 0, EAVE + 100 - (AY + 80) * Math.tan((7 * Math.PI) / 180)).color(k % 2 === 0 ? canvas : lemonade));
}

return p.model();
