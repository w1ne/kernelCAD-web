// Drop tower seat ring: the passenger carriage of a free-fall drop tower,
// parked at the loading level around the foot of its tower.
// What makes it a drop tower carriage rather than a ring of chairs: the square
// braced lattice tower rising through the middle, the steel carriage frame of
// two rings that hugs the tower on guide rollers, and the outward-facing
// moulded bucket seats whose riders' legs hang free, each closed by a padded
// over-the-shoulder restraint swinging down from above the headrest.
// Generic visualization geometry at real size (carriage about 4.2 m across,
// tower section 6 m tall), millimetres, Z up, tower plinth on z = 0.
meta({
  name: "drop-tower-seat-ring",
  license: "CC0-1.0",
  title: "Drop tower seat ring",
  description: "Drop tower passenger carriage at loading level: square braced lattice tower section on a concrete plinth, two-ring steel carriage frame with guide rollers, eight outward-facing moulded bucket seats with free-hanging legs, padded over-the-shoulder restraints or lap bars. Material controls: seat fiberglass, carriage steel, restraint padding, tower paint, plinth concrete. Restraint over-shoulder or lap-bar; festival and twilight presets.",
  tags: ["drop tower", "free fall ride", "freefall", "gyro drop", "thrill ride", "amusement park", "theme park", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2400,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const restraint = param("restraint", "over-shoulder", { choices: ["over-shoulder", "lap-bar"], label: "Rider restraint" });
const fiberglass = param("fiberglass", "#e8452f", { label: "Moulded seat bucket fiberglass" });
const steel = param("steel", "#9aa3a8", { label: "Carriage frame and roller steel" });
const rubber = param("rubber", "#262b30", { label: "Restraint padding" });
const towerPaint = param("towerPaint", "#e9e4d6", { label: "Tower lattice paint" });
const concrete = param("concrete", "#a9a59c", { label: "Plinth concrete" });

presets({
  festival: { fiberglass: "#d7a83f", steel: "#9da3a0", rubber: "#3c4245", towerPaint: "#d4554a", concrete: "#b3ada2" },
  twilight: { fiberglass: "#96566d", steel: "#4f626c", rubber: "#20262a", towerPaint: "#35576f", concrete: "#7f7c76" },
});

const p = assembly("drop-tower-seat-ring");
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

const PLINTH = 300;
const TOP = 6000;
const H = 500; // tower half-width

// Concrete plinth and the square braced lattice tower section.
add("plinth", turned([[0, 0], [1300, 0], [1300, PLINTH - 60], [1240, PLINTH], [0, PLINTH]]).color(concrete));
const CORNERS = [[H, H], [-H, H], [-H, -H], [H, -H]];
CORNERS.forEach(([x, y], i) => add(`tower-chord-${i}`, rod([x, y, PLINTH], [x, y, TOP], 70, 8).color(towerPaint)));
const BAY = 1140;
for (let f = 0; f < 4; f += 1) {
  const [x0, y0] = CORNERS[f];
  const [x1, y1] = CORNERS[(f + 1) % 4];
  for (let b = 0; b * BAY + PLINTH + BAY <= TOP; b += 1) {
    const z0 = PLINTH + b * BAY;
    const z1 = z0 + BAY;
    const [a, c] = b % 2 === 0 ? [[x0, y0, z0], [x1, y1, z1]] : [[x1, y1, z0], [x0, y0, z1]];
    add(`tower-brace-${f}-${b}`, rod(a, c, 28, 6).color(towerPaint));
    add(`tower-strut-${f}-${b}`, rod([x0, y0, z1], [x1, y1, z1], 30, 6).color(towerPaint));
  }
}

// Carriage frame: lower and upper rings joined by posts, rolling on the tower.
const ZL = 1150;
const ZU = 2600;
add("carriage-lower-ring", turned([[1380, ZL], [1620, ZL], [1620, ZL + 110], [1380, ZL + 110]]).color(steel));
add("carriage-upper-ring", turned([[1420, ZU], [1560, ZU], [1560, ZU + 90], [1420, ZU + 90]]).color(steel));
for (const [k, z, h] of [["lower", ZL, 110], ["upper", ZU, 90]]) {
  add(`carriage-${k}-collar`, turned([[760, z], [900, z], [900, z + h], [760, z + h]]).color(steel));
  for (let i = 0; i < 8; i += 1) {
    add(`carriage-${k}-spoke-${i}`, box(560, 90, h, true).translate(1150, 0, z + h / 2).rotateZ(i * 45 + 22.5).color(steel));
  }
}
for (let i = 0; i < 4; i += 1) {
  const a = i * 90 + 45;
  add(`guide-roller-${i}-low`, box(140, 180, 260, true).translate(H + 110, 0, ZL + 60).rotateZ(a).color(rubber));
  add(`guide-roller-${i}-high`, box(140, 180, 260, true).translate(H + 110, 0, ZU + 40).rotateZ(a).color(rubber));
  add(`carriage-post-${i}`, rod([1150, 0, ZL + 110], [1150, 0, ZU], 55, 8).rotateZ(a).color(steel));
}

// Outward-facing bucket seats (local radial axis +X), rotated around the ring.
const BUCKET = [[1500, ZL + 110], [2000, ZL + 110], [2040, ZL + 210], [1700, ZL + 230], [1690, ZU + 100], [1620, ZU + 200], [1540, ZU + 140]];
const OTSR = [
  [1640, ZU + 160], [1820, ZU + 140], [1960, ZU - 60], [1990, ZL + 650], [1930, ZL + 450], [1870, ZL + 470],
  [1900, ZL + 650], [1880, ZU - 90], [1770, ZU + 50], [1640, ZU + 70],
];
const SEATS = 8;
for (let i = 0; i < SEATS; i += 1) {
  const a = (i * 360) / SEATS;
  add(`seat-bucket-${i}`, sideProfile(BUCKET, 470).rotateZ(a).color(fiberglass));
  if (restraint.value === "over-shoulder") {
    add(`shoulder-restraint-${i}`, sideProfile(OTSR, 320).rotateZ(a).color(rubber));
    add(`restraint-pivot-${i}`, box(180, 360, 110, true).translate(1640, 0, ZU + 160).rotateZ(a).color(steel));
  } else {
    add(`lap-bar-${i}`, rod([1950, -200, ZL + 450], [1950, 200, ZL + 450], 45, 8).rotateZ(a).color(rubber));
    add(`lap-bar-post-${i}`, rod([1720, 0, ZL + 230], [1950, 0, ZL + 450], 30, 6).rotateZ(a).color(steel));
  }
}

return p.model();
