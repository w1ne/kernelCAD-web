// SPDX-License-Identifier: CC0-1.0
// Soft drink fountain: the self-serve drink station in a park food court
// where guests fill their own cups.
// What makes it a drink fountain rather than a generic cabinet: a dispenser
// tower with a sloped, back-lit merchandiser front and a lightbox header; a
// row of valve nozzles each with a push lever and flavour badge; an ice chute
// with its own lever; a slotted drip tray; cup stacks on one side and a lid
// and straw station on the other; all on a counter with door panels below.
// Generic visualization geometry at about real size (about 1.7 m wide,
// 0.8 m deep, 2.35 m to the lightbox top), millimetres, Z up, guest face on
// -Y, standing on z = 0.
meta({
  name: "soft-drink-fountain",
  license: "CC0-1.0",
  title: "Soft drink fountain",
  description: "Self-serve soft drink fountain at about real size: a dispenser tower with a sloped merchandiser front and lightbox header, five valve nozzles with push levers and flavour badges, an ice chute with lever, a slotted drip tray, cup stacks, a lid and straw station, and a counter on a door-panelled base cabinet. Material controls: enamel cabinet and tower, stainless steel, merchandiser graphic, black polymer. Festival, twilight and citrus presets.",
  tags: ["soda fountain", "drink dispenser", "self-serve", "beverage", "food court", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enamel = param("enamel", "#c8323c", { label: "Enamel cabinet and tower" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless counter, tray and nozzles" });
const graphic = param("graphic", "#2f6fb4", { label: "Merchandiser graphic and cups" });
const polymer = param("polymer", "#25292c", { label: "Black polymer levers and grate" });

presets({
  festival: { enamel: "#edb34d", stainlessSteel: "#d1d1c6", graphic: "#d4527a", polymer: "#3a3f44" },
  twilight: { enamel: "#385b81", stainlessSteel: "#788b91", graphic: "#7fd0e6", polymer: "#1d2226" },
  citrus: { enamel: "#3f8f46", stainlessSteel: "#c3cbc8", graphic: "#f2c53a", polymer: "#2b2f33" },
});

const p = assembly("soft-drink-fountain");
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

const CW = 1700;
const CD = 760;
const FRONT = -CD / 2;
const TOP = 1000;

// Base cabinet with kick plate, two door panels with handles, and counter.
add("kick-plate", plan(rr(CW - 40, CD - 40, 30), 0, 90).color(polymer));
add("cabinet", plan(rr(CW, CD, 40), 90, TOP - 130).color(enamel));
for (const [k, x] of [-420, 420].entries()) {
  add(`door-${k}`, face([[x - 380, 150], [x + 380, 150], [x + 380, 900], [x - 380, 900]], 10, FRONT - 10).color(enamel));
  add(`door-handle-${k}`, box(24, 30, 220, true).translate(x + (k === 0 ? 330 : -330), FRONT - 25, 700).color(stainlessSteel));
}
add("counter", plan(rr(CW + 40, CD + 40, 40), TOP - 40, 40).color(stainlessSteel));

// Dispenser tower: back column, overhanging head with sloped front, lightbox.
const TW = 1080;
const HEAD_Z = 1420;
const tower = [[320, TOP], [320, 2080], [-200, 2080], [-250, 1880], [-300, HEAD_Z], [120, HEAD_Z], [120, TOP]];
add("tower", profileYZ(tower, TW).color(enamel));
add("merchandiser", profileYZ([[-254, 1860], [-298, 1460], [-316, 1460], [-272, 1860]], TW - 120).color(graphic));
add("head-trim", profileYZ([[-300, HEAD_Z], [-320, HEAD_Z], [-320, HEAD_Z + 40], [-300, HEAD_Z + 40]], TW).color(stainlessSteel));
add("lightbox", plan(rr(TW + 40, 520, 60), 2080, 240).translate(0, 60, 0).color(graphic));
add("lightbox-wave", face([[-560, 2100], [-200, 2160], [200, 2130], [560, 2190], [560, 2240], [200, 2180], [-200, 2210], [-560, 2150]], 10, -210).color(enamel));
add("lightbox-badge", cylinder(14, 110, 28).rotateX(90).translate(0, -210, 2200).color(stainlessSteel));

// Ice chute with lever on the left, five valve nozzles with levers and badges.
add("ice-chute", box(200, 160, 110, true).translate(-410, -200, HEAD_Z - 55).color(stainlessSteel));
add("ice-lever", box(160, 22, 220, true).rotateX(-12).translate(-410, -275, HEAD_Z - 170).color(polymer));
for (let k = 0; k < 5; k++) {
  const x = -220 + k * 150;
  add(`nozzle-${k}`, turned([[0, 0], [22, 0], [40, 60], [40, 80], [0, 80]]).translate(x, -180, HEAD_Z - 80).color(stainlessSteel));
  add(`lever-${k}`, box(80, 18, 190, true).rotateX(-12).translate(x, -260, HEAD_Z - 130).color(polymer));
  add(`flavour-badge-${k}`, cylinder(10, 40, 16).rotateX(90).translate(x, -305, HEAD_Z + 140).color(k % 2 === 0 ? stainlessSteel : enamel));
}

// Slotted drip tray under the nozzles.
add("drip-tray", plan(rr(TW - 40, 300, 20), TOP, 50).translate(0, -150, 0).color(stainlessSteel));
for (let k = 0; k < 14; k++) add(`grate-${k}`, box(16, 260, 12, true).translate(-480 + k * 74, -150, TOP + 54).color(polymer));

// Cup stacks on the left end, lid stacks and a straw holder on the right.
for (const [k, y] of [-200, 0, 200].entries()) {
  add(`cup-stack-${k}`, turned([[0, 0], [38, 0], [52, 340 - k * 60], [0, 340 - k * 60]]).translate(-CW / 2 + 70, y, TOP).color(graphic));
}
for (const [k, y] of [-200, -60].entries()) add(`lid-stack-${k}`, cylinder(120, 55, 16).translate(CW / 2 - 70, y, TOP).color(polymer));
add("straw-holder", cylinder(220, 50, 14).translate(CW / 2 - 70, 160, TOP).color(stainlessSteel));
for (let k = 0; k < 5; k++) add(`straw-${k}`, cylinder(300, 5, 6).rotateX(-8 + k * 4).rotateY(-10 + k * 5).translate(CW / 2 - 70 + (k - 2) * 12, 160, TOP + 100).color(graphic));

return p.model();
