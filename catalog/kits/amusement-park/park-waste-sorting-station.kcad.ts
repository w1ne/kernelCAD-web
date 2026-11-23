// SPDX-License-Identifier: CC0-1.0
// Park waste sorting station: the three-stream bin point by a food court
// where guests split recycling, food waste and general rubbish.
// What makes it a sorting station rather than a row of boxes: three bays clad
// in vertical timber slats, each with its own colour-coded sloped enamel lid
// and an aperture shaped for what goes in it (two round holes for bottles and
// cans, a square flap for food, a wide slot for general waste), a coloured
// band under each lid, a timber backboard with big colour roundels carrying
// the recycling, leaf and bin symbols, and a mono-pitch roof with a timber
// fascia on two steel posts.
// Generic visualization geometry at about real size (about 2.3 m wide, 0.8 m
// deep, 2 m to the roof), millimetres, Z up, apertures facing -Y, standing
// on z = 0.
meta({
  name: "park-waste-sorting-station",
  license: "CC0-1.0",
  title: "Park waste sorting station",
  description: "Three-stream park waste sorting station at about real size: three timber-slatted bays with colour-coded sloped enamel lids and shaped apertures (round holes for bottles and cans, a square food-waste flap, a wide general-waste slot), coloured bands, a timber backboard with recycling, leaf and bin symbol roundels, and a mono-pitch roof with a timber fascia on steel posts. Material controls: timber cladding, steel frame and general-waste lid, recycling enamel, organics enamel. Parkland, festival and twilight presets.",
  tags: ["waste bin", "recycling", "litter bin", "sorting station", "compost", "street furniture", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#a06d3f", { label: "Timber slats, backboard and fascia" });
const steel = param("steel", "#3f484d", { label: "Steel frame, roof and general-waste lid" });
const recyclingEnamel = param("recyclingEnamel", "#2f74b5", { label: "Recycling lid and roundel enamel" });
const organicsEnamel = param("organicsEnamel", "#4f9a45", { label: "Food-waste lid and roundel enamel" });

presets({
  parkland: { timber: "#a06d3f", steel: "#3f484d", recyclingEnamel: "#2f74b5", organicsEnamel: "#4f9a45" },
  festival: { timber: "#c08a50", steel: "#4a4f57", recyclingEnamel: "#f0b53a", organicsEnamel: "#d4553f" },
  twilight: { timber: "#6e4c33", steel: "#262c30", recyclingEnamel: "#3d5f9a", organicsEnamel: "#3c7046" },
});

const ICON = "#f3f2ea";

const p = assembly("park-waste-sorting-station");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Flat outline drawn in (x, z), t thick, facing -Y with its back on y = 0.
const plate = (pts, t: number) => extrudePolygon(pts, t).rotateX(90);

const BAYS = [
  { x: -650, key: "recycling", lid: recyclingEnamel },
  { x: 0, key: "organics", lid: organicsEnamel },
  { x: 650, key: "general", lid: steel },
];
const FRONT = -300;
const TOP = 960;

// Kick plinth, steel body and bay posts.
add("plinth", box(2000, 620, 60, true).translate(0, 0, 30).color(steel));
add("body", box(1950, 580, TOP - 60, true).translate(0, 0, (TOP + 60) / 2).color(steel));
for (const x of [-975, -325, 325, 975]) add(`bay-post-${x}`, box(50, 50, TOP - 60, true).translate(x, FRONT, (TOP + 60) / 2).color(steel));

// Timber slats on each bay front and the -X end.
for (const b of BAYS)
  for (let k = 0; k < 7; k++) add(`slat-${b.key}-${k}`, box(66, 20, 760, true).translate(b.x - 255 + k * 85, FRONT - 6, 470).color(timber));
for (let k = 0; k < 6; k++) add(`end-slat-${k}`, box(20, 66, 760, true).translate(-985, -230 + k * 92, 470).color(timber));

// Colour-coded sloped lids with shaped apertures, and a band under each.
for (const b of BAYS) {
  let lid = profileYZ([[-330, TOP], [300, TOP], [300, TOP + 80], [-330, TOP + 30]], 600).translate(b.x, 0, 0);
  if (b.key === "recycling") for (const dx of [-140, 140]) lid = lid.subtract(cylinder(300, 95, 20).translate(b.x + dx, -90, TOP - 100));
  if (b.key === "organics") lid = lid.subtract(box(220, 220, 300, true).translate(b.x, -60, TOP + 50));
  if (b.key === "general") lid = lid.subtract(box(420, 110, 300, true).translate(b.x, -90, TOP + 50));
  add(`lid-${b.key}`, lid.color(b.lid));
  add(`band-${b.key}`, box(600, 24, 90, true).translate(b.x, FRONT - 18, TOP - 70).color(b.lid));
}
// Food-waste flap propped half open over its aperture.
add("organics-flap", box(240, 240, 14, true).translate(0, 120, 0).rotateX(55).translate(0, 50, TOP + 60).color(organicsEnamel));
add("general-hood", profileYZ([[-160, TOP + 40], [-30, TOP + 140], [20, TOP + 140], [20, TOP + 60]], 460).translate(650, 0, 0).color(steel));

// Steel posts, timber backboard and mono-pitch roof.
for (const x of [-1040, 1040]) add(`roof-post-${x > 0 ? "r" : "l"}`, box(70, 70, 1950, true).translate(x, 260, 975).color(steel));
add("backboard", box(2010, 30, 640, true).translate(0, 275, 1380).color(timber));
add("roof", profileYZ([[-420, 1880], [380, 1960], [380, 2000], [-420, 1920]], 2300).color(steel));
add("fascia", box(2300, 30, 110, true).translate(0, -430, 1890).color(timber));

// Colour roundels with white stream symbols above each bay.
const RZ = 1300;
for (const b of BAYS) add(`roundel-${b.key}`, cylinder(16, 180, 32).rotateX(90).translate(b.x, 260, RZ).color(b.lid));
const tri = (r: number) => [0, 1, 2].map((k) => { const a = Math.PI / 2 + (k * 2 * Math.PI) / 3; return [r * Math.cos(a), r * Math.sin(a)]; });
add("icon-recycling", plate(tri(120), 10).subtract(plate(tri(62), 30).translate(0, 10, 0)).translate(-650, 244, RZ - 20).color(ICON));
for (let k = 0; k < 3; k++) add(`icon-arrow-${k}`, plate([[0, -26], [0, 26], [36, 0]], 10).translate(-10, 0, 52).rotateY(-60 - k * 120).translate(-650, 236, RZ - 20).color(ICON));
add("icon-leaf", plate([[-120, 0], [-70, 50], [0, 70], [70, 50], [120, 0], [70, -50], [0, -70], [-70, -50]], 10).rotateY(-35).translate(0, 244, RZ).color(ICON));
add("icon-leaf-vein", box(200, 12, 10, true).rotateY(-35).translate(0, 230, RZ).color(organicsEnamel));
add("icon-bin", plate([[-55, -90], [55, -90], [72, 60], [-72, 60]], 10).translate(650, 244, RZ - 10).color(ICON));
add("icon-bin-lid", box(180, 10, 22, true).translate(650, 239, RZ + 70).color(ICON));
add("icon-bin-handle", box(50, 10, 20, true).translate(650, 239, RZ + 92).color(ICON));

return p.model();
