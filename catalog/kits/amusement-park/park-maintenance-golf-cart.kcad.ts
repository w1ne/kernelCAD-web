// Park maintenance cart: the small electric utility vehicle park crews drive
// along guest paths, a golf-cart cab with a cargo bed behind.
// What makes it a utility cart rather than a box on wheels: the sloped front
// cowl with headlights and bumper, the open cab with a two-seat bench, tilted
// steering wheel and windscreen under a roof canopy on four posts, the
// steel cargo box (or flatbed with a ladder rack) behind the seat, and four
// small tyres with hubs on a low frame.
// Generic visualization geometry at real size (about 3.0 m long, 1.3 m wide,
// 1.95 m to the roof), millimetres, Z up, tyres on z = 0, front towards +X.
meta({
  name: "park-maintenance-golf-cart",
  license: "CC0-1.0",
  title: "Park maintenance cart",
  description: "Electric park maintenance utility cart: sloped front cowl with headlights and bumper, open cab with two-seat bench, tilted steering wheel and windscreen under a four-post roof canopy, steel cargo box or flatbed with ladder rack, four tyres with hubs on a low frame. Material controls: body enamel, bed and frame steel, tyre rubber, seat vinyl, roof plastic, windscreen glass. Bed cargo-box or flatbed; festival and twilight presets.",
  tags: ["utility cart", "golf cart", "maintenance vehicle", "electric utility vehicle", "park operations", "amusement park", "theme park", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const bed = param("bed", "cargo-box", { choices: ["cargo-box", "flatbed"], label: "Rear bed" });
const enamel = param("enamel", "#2f7d4f", { label: "Body cowl and seat base enamel" });
const steel = param("steel", "#8a949a", { label: "Bed, posts and frame steel" });
const rubber = param("rubber", "#24282b", { label: "Tyre and bumper rubber" });
const seatVinyl = param("seatVinyl", "#e8e2d2", { label: "Seat vinyl" });
const roofPlastic = param("roofPlastic", "#f1f0ea", { label: "Roof canopy plastic" });
const screenGlass = param("screenGlass", "#9cc3cf", { label: "Windscreen and headlight glass" });

presets({
  festival: { enamel: "#edb34d", steel: "#9da3a0", rubber: "#3c4245", seatVinyl: "#2f4f7a", roofPlastic: "#d4554a", screenGlass: "#b4d6dd" },
  twilight: { enamel: "#385b81", steel: "#4f626c", rubber: "#20262a", seatVinyl: "#1f2a36", roofPlastic: "#c9c6bc", screenGlass: "#6e98a6" },
});

const p = assembly("park-maintenance-golf-cart");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Solid from an (x, z) side profile, extruded `t` thick and centred on y = 0.
const sideProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const R = 280;
const ROOF = 1870;

// Four tyres with hubs, axles along Y.
for (const x of [-920, 960]) {
  for (const y of [-560, 560]) {
    const k = `${x < 0 ? "rear" : "front"}-${y < 0 ? "left" : "right"}`;
    add(`tyre-${k}`, turned([[150, -100], [255, -100], [R, -60], [R, 60], [255, 100], [150, 100]]).rotateX(90).translate(x, y, R).color(rubber));
    add(`hub-${k}`, turned([[0, -95], [155, -95], [155, 95], [0, 95]]).rotateX(90).translate(x, y, R).color(steel));
  }
}

// Low frame and floor pan.
add("frame", box(2700, 820, 120, true).translate(-80, 0, 300).color(steel));
add("floor-pan", box(1000, 1100, 50, true).translate(220, 0, 385).color(rubber));

// Sloped front cowl with dash, headlights and bumper.
add("front-cowl", sideProfile([[680, 300], [1430, 300], [1500, 420], [1460, 650], [1130, 800], [760, 860], [680, 860]], 900).color(enamel));
add("dash", sideProfile([[640, 760], [780, 760], [780, 900], [700, 940], [640, 900]], 1120).color(enamel));
for (const y of [-300, 300]) add(`headlight-${y < 0 ? "left" : "right"}`, rod([1460, y, 600], [1500, y, 610], 70, 10).color(screenGlass));
add("front-bumper", box(110, 1150, 140, true).translate(1540, 0, 340).color(rubber));

// Cab: seat base, bench cushion and backrest, steering wheel.
add("seat-base", box(520, 1100, 290, true).translate(-120, 0, 505).color(enamel));
add("seat-cushion", box(540, 1060, 100, true).translate(-110, 0, 700).color(seatVinyl));
add("seat-back", sideProfile([[-400, 740], [-300, 740], [-260, 1180], [-330, 1200], [-400, 1170]], 1060).color(seatVinyl));
add("steering-column", rod([700, -270, 880], [470, -270, 1080], 25, 6).color(steel));
add("steering-wheel", turned([[150, -20], [200, -20], [200, 20], [150, 20]]).rotateY(-50).translate(470, -270, 1080).color(rubber));
add("steering-hub", turned([[0, -15], [45, -15], [45, 15], [0, 15]]).rotateY(-50).translate(470, -270, 1080).color(rubber));

// Roof canopy on four posts, windscreen between the front posts.
for (const y of [-555, 555]) {
  const k = y < 0 ? "left" : "right";
  add(`rear-post-${k}`, rod([-380, y, 400], [-380, y, ROOF], 26, 8).color(steel));
  add(`front-post-${k}`, rod([760, y, 820], [600, y, ROOF], 26, 8).color(steel));
}
add("roof-canopy", sideProfile([[-560, ROOF], [820, ROOF], [860, ROOF + 40], [820, ROOF + 90], [-520, ROOF + 90], [-580, ROOF + 40]], 1280).color(roofPlastic));
add("windscreen", box(16, 1080, 980, true).rotateY(-9).translate(682, 0, 1340).color(screenGlass));

// Rear bed behind the seat.
if (bed.value === "cargo-box") {
  add("bed-floor", box(1080, 1180, 40, true).translate(-960, 0, 690).color(steel));
  for (const y of [-570, 570]) add(`bed-side-${y < 0 ? "left" : "right"}`, box(1080, 40, 300, true).translate(-960, y, 860).color(steel));
  add("bed-headboard", box(40, 1180, 520, true).translate(-420, 0, 950).color(steel));
  add("bed-tailgate", box(40, 1180, 300, true).translate(-1500, 0, 860).color(steel));
  for (const y of [-570, 570]) add(`bed-cap-${y < 0 ? "left" : "right"}`, box(1100, 70, 24, true).translate(-960, y, 1020).color(enamel));
  add("bed-tailgate-cap", box(70, 1210, 24, true).translate(-1500, 0, 1020).color(enamel));
} else {
  add("flatbed-deck", box(1080, 1200, 50, true).translate(-960, 0, 690).color(steel));
  add("flatbed-headboard", box(40, 1200, 560, true).translate(-420, 0, 990).color(steel));
  for (const x of [-1440, -480]) {
    for (const y of [-560, 560]) add(`rack-post-${x}-${y < 0 ? "l" : "r"}`, rod([x, y, 715], [x, y, 1420], 22, 6).color(steel));
    add(`rack-crossbar-${x}`, rod([x, -580, 1420], [x, 580, 1420], 24, 6).color(steel));
  }
  for (const y of [-560, 560]) add(`rack-rail-${y < 0 ? "left" : "right"}`, rod([-1460, y, 1420], [-460, y, 1420], 22, 6).color(steel));
  add("ladder-left-rail", box(1500, 40, 60, true).translate(-860, -200, 1470).color(enamel));
  add("ladder-right-rail", box(1500, 40, 60, true).translate(-860, 200, 1470).color(enamel));
  for (let i = 0; i < 6; i += 1) add(`ladder-rung-${i}`, rod([-1530 + i * 270, -200, 1470], [-1530 + i * 270, 200, 1470], 15, 6).color(enamel));
}
add("rear-bumper", box(80, 1150, 120, true).translate(-1560, 0, 330).color(rubber));

return p.model();
