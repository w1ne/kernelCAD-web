// SPDX-License-Identifier: CC0-1.0
// Ball toss target wall: the midway beanbag game where you throw through a
// painted bullseye to win.
// What makes it a ball toss rather than a painted wall: three real holes cut
// through the target board, each ringed by red-and-white bullseye bands with
// a dark catch bag behind it; an arched marquee header with lamp bulbs; side
// wings that funnel throws into the board; and a throw counter with
// beanbags and a bag bucket set out in front.
// Generic visualization geometry at about real size (2.6 m across the
// wings, 2.4 m to the marquee top), millimetres, Z up, guest face on -Y,
// standing on z = 0.
meta({
  name: "ball-toss-target-wall",
  license: "CC0-1.0",
  title: "Ball toss target wall",
  description: "Midway beanbag toss game at about real size: a target board with three holes cut through it, each ringed by bullseye bands with a dark catch bag behind, an arched marquee header with lamp bulbs, angled side wings, and a throw counter set with beanbags and a bag bucket. Material controls: painted timber, target enamel, canvas, painted steel. Festival, twilight and vintage presets.",
  tags: ["ball toss", "beanbag toss", "bullseye", "target board", "midway game", "carnival game", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#2f6fb5", { label: "Painted timber board, wings and counter" });
const enamel = param("enamel", "#d8352f", { label: "Target enamel bands, marquee and beanbags" });
const canvas = param("canvas", "#f5efe0", { label: "Canvas bands, lettering strip and bulbs" });
const steel = param("steel", "#3a4146", { label: "Painted steel frame and catch bags" });

presets({
  festival: { timber: "#2b9a5a", enamel: "#f2b632", canvas: "#fffaf0", steel: "#2d3236" },
  twilight: { timber: "#3b3f73", enamel: "#c2457f", canvas: "#e4dcf2", steel: "#22262b" },
  vintage: { timber: "#8a5a34", enamel: "#b8452f", canvas: "#efe1c0", steel: "#4b4038" },
});

const p = assembly("ball-toss-target-wall");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t thick along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Flat ring in the XZ plane, t thick toward +Y from y0.
const ring = (R: number, r: number, t: number, y0: number) =>
  cylinder(t, R, 32).subtract(cylinder(t + 40, r, 32).translate(0, 0, -20)).rotateX(90).translate(0, y0 + t, 0);

const BW = 2000;
const BY = 300;
const BT = 110;
const HOLES: [number, number][] = [[-600, 950], [0, 1300], [600, 950]];
const HR = 150;

// Steel ground frame and two rear legs.
add("ground-frame", plan(rr(BW + 200, 900, 40), 0, 90).translate(0, 120, 0).color(steel));
for (const x of [-BW / 2 + 80, BW / 2 - 80]) add(`rear-leg-${x < 0 ? "l" : "r"}`, box(80, 80, 1700, true).translate(x, BY + BT + 40, 940).color(steel));

// Target board with three holes cut through it.
let board = face([[-BW / 2, 90], [BW / 2, 90], [BW / 2, 1750], [-BW / 2, 1750]], BT, BY);
for (const [x, z] of HOLES) board = board.subtract(cylinder(BT + 200, HR, 32).rotateX(90).translate(x, BY + BT + 100, z));
add("target-board", board.color(timber));

// Bullseye bands around each hole and a dark catch bag behind it.
for (const [k, [x, z]] of HOLES.entries()) {
  add(`band-inner-${k}`, ring(HR + 60, HR, 14, BY - 14).translate(x, 0, z).color(enamel));
  add(`band-mid-${k}`, ring(HR + 120, HR + 60, 10, BY - 10).translate(x, 0, z).color(canvas));
  add(`band-outer-${k}`, ring(HR + 180, HR + 120, 14, BY - 14).translate(x, 0, z).color(enamel));
  add(`catch-bag-${k}`, turned([[0, 0], [HR + 30, 0], [HR + 10, 260], [60, 420], [0, 430]]).rotateX(-90).translate(x, BY + BT, z).color(steel));
}

// Arched marquee header with a lettering strip and lamp bulbs.
const ARC = 12;
const arch: [number, number][] = [[-BW / 2 - 60, 1700], [BW / 2 + 60, 1700]];
for (let k = 0; k <= ARC; k++) {
  const a = (k / ARC) * Math.PI;
  arch.push([Math.cos(a) * (BW / 2 + 60), 2050 + Math.sin(a) * 330]);
}
add("marquee", face(arch, 90, BY - 30).color(enamel));
add("lettering-strip", face([[-700, 1880], [700, 1880], [700, 2080], [-700, 2080]], 14, BY - 44).color(canvas));
for (let k = 1; k < ARC; k++) {
  const a = (k / ARC) * Math.PI;
  add(`bulb-${k}`, sphere(38).translate(Math.cos(a) * (BW / 2 - 30), BY - 40, 2050 + Math.sin(a) * 240).color(canvas));
}

// Angled side wings with scalloped tops that funnel throws into the board.
for (const sx of [-1, 1]) {
  const wing = profileYZ([[0, 0], [-700, 0], [-700, 1250], [-450, 1450], [0, 1700]], 60);
  add(`side-wing-${sx > 0 ? "r" : "l"}`, wing.rotateZ(sx * 18).translate(sx * (BW / 2 + 20), BY, 0).color(timber));
  add(`wing-trim-${sx > 0 ? "r" : "l"}`, profileYZ([[0, 1250], [-700, 1250], [-700, 1320], [0, 1320]], 70).rotateZ(sx * 18).translate(sx * (BW / 2 + 20), BY, 0).color(canvas));
}

// Throw counter on steel brackets, with beanbags and a bag bucket.
const CY = -650;
add("counter-top", plan(rr(1500, 340, 30), 940, 50).translate(0, CY, 0).color(timber));
add("counter-skirt", face([[-720, 120], [720, 120], [720, 900], [-720, 900]], 30, CY - 160).color(enamel));
for (const x of [-680, 0, 680]) add(`counter-post-${x}`, box(60, 60, 940, true).translate(x, CY + 60, 470).color(steel));
add("counter-rail", cylinder(1360, 22, 12).rotateY(90).translate(-680, CY + 60, 120).color(steel));
[[-520, -40], [-330, 20], [-430, -90], [300, -30]].forEach(([x, dy], i) =>
  add(`beanbag-${i}`, sphere(90).scale([1.2, 1, 0.55]).rotateZ(i * 35).translate(x, CY + dy, 1040 + (i === 2 ? 50 : 0)).color(i % 2 ? canvas : enamel)),
);
add("bag-bucket", turned([[0, 0], [110, 0], [140, 230], [125, 230], [98, 20], [0, 20]]).translate(620, CY, 990).color(steel));
for (const [i, [dx, dy]] of [[-30, 20], [40, -10]].entries())
  add(`bucket-bag-${i}`, sphere(62).scale([1.2, 1, 0.55]).rotateZ(i * 60).translate(620 + dx, CY + dy, 1200).color(enamel));

return p.model();
