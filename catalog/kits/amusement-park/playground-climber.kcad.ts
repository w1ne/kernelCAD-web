// SPDX-License-Identifier: CC0-1.0
// Playground climber: the small family-zone play tower parents park a
// stroller beside while toddlers burn off energy between rides.
// What makes it a play tower rather than a table on legs: four round
// powder-coated posts with moulded base collars carrying a gabled moulded roof; a
// rubber-gripped deck at about 1.1 m behind tube guard rails; a raked
// ladder with round rungs on the front; a moulded slide that leaves the deck
// on the +X side and curves down into a flat run-out; and a crawl-through
// tube under the deck on the -X side.
// Generic visualization geometry at about real size (about 3.6 m long,
// 1.6 m deep, 2.5 m to the ridge), millimetres, Z up, ladder facing -Y,
// standing on z = 0.
meta({
  name: "playground-climber",
  license: "CC0-1.0",
  title: "Playground climber",
  description: "Family-zone play tower at about real size: four round posts with moulded base collars under a gabled moulded roof, rubber-gripped deck behind tube guard rails, raked front ladder with round rungs, a curved moulded slide with side walls and run-out, and a crawl-through tube under the deck. Material controls: powder-coated frame, moulded plastic, rubber deck. Festival, twilight and jungle presets.",
  tags: ["playground", "play tower", "climbing frame", "slide", "kids", "amusement park", "theme park", "family zone", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2600,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#2f7fb8", { label: "Powder-coated posts, rails and ladder" });
const plastic = param("plastic", "#f2b632", { label: "Moulded plastic roof, slide and tube" });
const rubber = param("rubber", "#3d4a3f", { label: "Rubber-gripped deck" });

presets({
  festival: { powderCoat: "#d0473a", plastic: "#ffd447", rubber: "#3c4245" },
  twilight: { powderCoat: "#35576f", plastic: "#a77bd6", rubber: "#20262a" },
  jungle: { powderCoat: "#3f6b3a", plastic: "#e57a2e", rubber: "#5a4632" },
});

const p = assembly("playground-climber");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Round bar between two 3D points.
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const DECK = 1100;
const H = 450; // half the tower footprint
const CORNERS: [number, number][] = [[-H, -H], [H, -H], [-H, H], [H, H]];

// Corner posts running up into the roof, with moulded base collars.
CORNERS.forEach(([x, y], i) => {
  add(`post-${i}`, cylinder(2190, 50, 12).translate(x, y, 0).color(powderCoat));
  add(`post-collar-${i}`, cylinder(120, 75, 12).color(plastic).translate(x, y, 0));
});

// Rubber deck and its edge band.
add("deck", box(2 * H + 60, 2 * H + 60, 70, true).translate(0, 0, DECK).color(rubber));
add("deck-band", box(2 * H + 80, 2 * H + 80, 40, true).translate(0, 0, DECK - 50).color(powderCoat));

// Gabled roof with eaves overhang, ridge along X.
const ROOF = [[-H - 170, 2160], [0, 2500], [H + 170, 2160], [H + 170, 2100], [0, 2430], [-H - 170, 2100]];
add("roof", longSide(ROOF, 2 * H + 240).color(plastic));

// Guard rails on the back and -X side (top and mid tube), front left open for the ladder.
for (const z of [DECK + 420, DECK + 220]) {
  add(`rail-back-${z}`, rod([-H, H, z], [H, H, z], 22).color(powderCoat));
  add(`rail-left-${z}`, rod([-H, -H, z], [-H, H, z], 22).color(powderCoat));
}
for (let i = 1; i < 5; i++) {
  const t = -H + (2 * H * i) / 5;
  add(`baluster-back-${i}`, rod([t, H, DECK + 30], [t, H, DECK + 420], 14, 6).color(powderCoat));
  add(`baluster-left-${i}`, rod([-H, t, DECK + 30], [-H, t, DECK + 420], 14, 6).color(powderCoat));
}
// Slide entry hoop on the +X side.
add("slide-hoop", torus(300, 26, 16).rotateY(90).translate(H, 0, DECK + 300).color(powderCoat));

// Raked ladder on the front: two rails and round rungs.
const foot = -H - 520;
for (const x of [-260, 260]) add(`ladder-rail-${x > 0 ? "r" : "l"}`, rod([x, foot, 24], [x, -H, DECK + 380], 30).color(powderCoat));
for (let k = 1; k <= 5; k++) {
  const z = 8 + ((DECK - 8) * k) / 6;
  const y = foot + ((-H - foot) * (z - 8)) / (DECK + 372);
  add(`ladder-rung-${k}`, rod([-260, y, z], [260, y, z], 20).color(powderCoat));
}
add("ladder-foot", box(620, 90, 12, true).translate(0, foot, 6).color(rubber));

// Curved slide leaving the deck at +X: bed and two side walls.
const slideTop: [number, number][] = [];
for (let i = 0; i <= 8; i++) {
  const s = i / 8;
  const x = H + 40 + 1900 * s;
  const z = DECK + 40 - (DECK - 300) * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, s * 1.25)));
  slideTop.push([x, z]);
}
const bed = [...slideTop, ...slideTop.slice().reverse().map(([x, z]) => [x, z - 50])];
add("slide-bed", front(bed, 520, -260).color(plastic));
for (const y of [-280, 260]) {
  const wall = [...slideTop.map(([x, z]) => [x, z + 160]), ...slideTop.slice().reverse().map(([x, z]) => [x, z - 50])];
  add(`slide-wall-${y > 0 ? "back" : "front"}`, front(wall, 20, y).color(plastic));
}
const runOut = slideTop[slideTop.length - 1];
add("slide-leg", box(80, 400, runOut[1] - 50, true).translate(runOut[0] - 200, 0, (runOut[1] - 50) / 2).color(powderCoat));

// Crawl-through tube under the deck on the -X side.
const tube = cylinder(1100, 330, 16).subtract(cylinder(1120, 270, 16).translate(0, 0, -10));
add("crawl-tube", tube.rotateY(90).translate(-H - 650, 0, 340).color(plastic));
add("crawl-tube-cradle", box(140, 520, 30, true).translate(-H - 600, 0, 15).color(powderCoat));
add("crawl-tube-cradle-2", box(140, 520, 30, true).translate(-H + 300, 0, 15).color(powderCoat));

return p.model();
