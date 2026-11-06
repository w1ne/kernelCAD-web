// Family carousel (merry-go-round): a turning platform of carved horses that
// rise and fall on polished poles under a striped tent canopy.
// What makes it a carousel rather than a round table: the stepped round deck
// with a painted skirt, the octagonal mirrored centre drum, the leaping horse
// figures (side-profile extrusions with saddles) on vertical poles at staggered
// heights, the striped conical canopy with a rounding board and scalloped
// valance, and the finial with a pennant on the crown.
// Generic visualization geometry at real size (about 6.3 m across, 4.6 m to the
// finial), millimetres, Z up, deck skirt on z = 0.
meta({
  name: "family-carousel",
  license: "CC0-1.0",
  title: "Family carousel",
  description: "Family carousel (merry-go-round) about 6.3 m across: stepped timber deck with a painted skirt, octagonal mirrored centre drum, leaping horse figures with saddles on polished poles at staggered heights, striped conical canopy with rounding board, scalloped valance and pennant finial. Material controls: painted steel and canopy stripes, polished pole steel, fiberglass horses, canopy canvas, timber deck. Rows single or double; festival and twilight presets.",
  tags: ["carousel", "merry-go-round", "galloper", "carousel horse", "amusement park", "theme park", "fairground ride", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3400,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const rows = param("rows", "double", { choices: ["single", "double"], label: "Horse rows" });
const powderCoat = param("powderCoat", "#c8363a", { label: "Painted steel skirt, saddles and canopy stripes" });
const stainlessSteel = param("stainlessSteel", "#d8c48c", { label: "Polished poles, mirrors and finial" });
const fiberglass = param("fiberglass", "#f3eee4", { label: "Fiberglass horse figures" });
const canopyCanvas = param("canopyCanvas", "#f6e3a6", { label: "Canopy canvas stripes and rounding board" });
const timberDeck = param("timberDeck", "#9a6b43", { label: "Timber deck and step" });

presets({
  festival: { powderCoat: "#d47452", stainlessSteel: "#e2cf8f", fiberglass: "#fbf6ea", canopyCanvas: "#d7a83f", timberDeck: "#a5764a" },
  twilight: { powderCoat: "#35576f", stainlessSteel: "#b6a77a", fiberglass: "#e4dcd2", canopyCanvas: "#96566d", timberDeck: "#6e5038" },
});

const p = assembly("family-carousel");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z, optionally only a sector.
const turned = (pts, angleDeg) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return angleDeg ? pb.close().revolve({ angleDeg }) : pb.close().revolve();
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

const DECK = 260;
const RIM = 3050;
const EAVE = 3150;

// Stepped round deck: painted skirt, timber boards on top and a boarding step.
add("platform-skirt", turned([[0, 0], [2900, 0], [2900, 200], [2860, DECK - 20], [0, DECK - 20]]).color(powderCoat));
add("platform-deck", turned([[0, DECK - 20], [2860, DECK - 20], [2860, DECK], [0, DECK]]).color(timberDeck));
add("boarding-step", turned([[2900, 0], [3150, 0], [3150, 110], [2900, 110]]).color(timberDeck));

// Octagonal centre drum with mirror panels on every face.
const OCT = Array.from({ length: 8 }, (_, i) => [640 * Math.cos(((i + 0.5) / 8) * Math.PI * 2), 640 * Math.sin(((i + 0.5) / 8) * Math.PI * 2)]);
add("centre-drum", extrudePolygon(OCT, EAVE - DECK).translate(0, 0, DECK).color(powderCoat));
add("centre-drum-cornice", turned([[0, EAVE - 260], [720, EAVE - 260], [760, EAVE - 160], [0, EAVE - 160]]).color(canopyCanvas));
for (let i = 0; i < 8; i += 1) {
  const a = (i / 8) * 360;
  add(`drum-mirror-${i}`, box(30, 380, 1500, true).translate(600, 0, DECK + 1250).rotateZ(a).color(stainlessSteel));
}

// Striped conical canopy: sixteen revolved sectors in alternating colours.
const SECTORS = 16;
for (let i = 0; i < SECTORS; i += 1) {
  add(`canopy-panel-${i}`, turned([[0, 4120], [RIM + 60, EAVE + 40], [RIM + 60, EAVE - 30], [0, 4050]], 360 / SECTORS)
    .rotateZ((i * 360) / SECTORS)
    .color(i % 2 === 0 ? powderCoat : canopyCanvas));
}
add("rounding-board", turned([[RIM, EAVE - 380], [RIM + 70, EAVE - 380], [RIM + 70, EAVE + 40], [RIM, EAVE + 40]]).color(canopyCanvas));
add("rounding-board-band", turned([[RIM + 70, EAVE - 220], [RIM + 90, EAVE - 220], [RIM + 90, EAVE - 160], [RIM + 70, EAVE - 160]]).color(stainlessSteel));
// Scalloped valance: a pennant tab hanging under the board between each stripe.
for (let i = 0; i < SECTORS * 2; i += 1) {
  const tab = sideProfile([[-180, 0], [180, 0], [0, -200]], 20).translate(0, 0, EAVE - 380).translate(0, RIM + 45, 0);
  add(`valance-tab-${i}`, tab.rotateZ(((i + 0.5) * 360) / (SECTORS * 2) - 90).color(i % 2 === 0 ? powderCoat : canopyCanvas));
}
// Crown finial and pennant flag.
add("crown-finial", turned([[0, 4080], [120, 4080], [160, 4200], [90, 4320], [30, 4400], [0, 4440]]).color(stainlessSteel));
add("pennant-mast", rod([0, 0, 4400], [0, 0, 4700], 14, 6).color(stainlessSteel));
add("pennant-flag", sideProfile([[0, 4560], [0, 4690], [380, 4625]], 12).color(powderCoat));

// Leaping horse side profile (x forward, z up), saddle sits around x = 0, z = 760.
const HORSE = [
  [-520, 700], [-700, 560], [-640, 510], [-520, 600], [-500, 480], [-560, 250], [-660, 40], [-580, 20],
  [-430, 260], [-380, 450], [250, 450], [380, 330], [500, 250], [560, 300], [440, 420], [430, 500],
  [520, 640], [660, 760], [810, 760], [840, 840], [700, 960], [650, 1030], [600, 960], [520, 940],
  [380, 770], [200, 740],
];
const ride = (key, radius, angleDeg, lift) => {
  const at = (s) => s.translate(0, radius, 0).rotateZ(angleDeg);
  const zBase = DECK + 200 + lift;
  // Horses face along the direction of travel (tangent to the ring).
  const figure = (s) => at(s.rotateZ(180).translate(0, 0, zBase));
  add(`horse-${key}`, figure(sideProfile(HORSE, 230)).color(fiberglass));
  add(`horse-${key}-saddle`, figure(box(300, 250, 60, true).translate(-80, 0, 760)).color(powderCoat));
  add(`horse-${key}-stirrups`, figure(box(60, 330, 260, true).translate(-80, 0, 620)).color(stainlessSteel));
  add(`horse-${key}-pole`, at(rod([0, 0, DECK], [0, 0, EAVE - 380], 28, 8)).color(stainlessSteel));
};
const OUTER = 8;
for (let i = 0; i < OUTER; i += 1) ride(`outer-${i}`, 2350, (i * 360) / OUTER, i % 2 === 0 ? 0 : 260);
if (rows.value === "double") {
  const INNER = 6;
  for (let i = 0; i < INNER; i += 1) ride(`inner-${i}`, 1500, (i * 360) / INNER + 30, i % 2 === 0 ? 220 : 0);
}

return p.model();
