// SPDX-License-Identifier: CC0-1.0
// Guest services map kiosk: the covered "you are here" board near the park
// gate where guests stop to plan their day and pick up a paper guide.
// What makes it a map kiosk rather than a sign on a stick: two timber posts
// on a brick-faced plinth carrying a small gabled shingle roof with
// bargeboards; a framed park map between the posts showing a lake, green
// lands, a winding main path and a red "you are here" pin; and a slanted
// brochure rack under the map with pockets of folded park guides.
// Generic visualization geometry at about real size (about 1.8 m wide,
// 1.0 m deep, 2.75 m to the ridge), millimetres, Z up, map facing -Y,
// standing on z = 0.
meta({
  name: "guest-services-map-kiosk",
  license: "CC0-1.0",
  title: "Guest services map kiosk",
  description: "Covered park-map stand at about real size: two timber posts on a brick-faced plinth under a gabled shingle roof with bargeboards, a framed illustrated park map with lake, lands, winding main path and a you-are-here pin, and a slanted brochure rack with pockets of folded guides. Material controls: painted timber, roofing, map print, stainless trim, lake water. Festival, twilight and rustic presets.",
  tags: ["map", "park map", "information kiosk", "wayfinding", "guest services", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paintedTimber = param("paintedTimber", "#2f5f4a", { label: "Painted timber posts, frame and rack" });
const roofing = param("roofing", "#7a3b30", { label: "Shingle roofing" });
const mapPrint = param("mapPrint", "#8fbf6a", { label: "Map print (park lands)" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless trim, plinth cap and paths" });
const water = param("water", "#4f9bd0", { label: "Map print (lake)" });

presets({
  festival: { paintedTimber: "#be4a3a", roofing: "#2f5f8f", mapPrint: "#a7d07a", stainlessSteel: "#f1e6c8", water: "#3fb6e0" },
  twilight: { paintedTimber: "#35465f", roofing: "#2a2f3a", mapPrint: "#6f8f9f", stainlessSteel: "#c9b26a", water: "#3f5f8f" },
  rustic: { paintedTimber: "#7a5534", roofing: "#4a4a44", mapPrint: "#c9b77d", stainlessSteel: "#8a8f8c", water: "#5f8f9a" },
});

const p = assembly("guest-services-map-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const rect = (x0: number, z0: number, x1: number, z1: number) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const PX = 720; // post centre offset
const MAP_Z0 = 1000;
const MAP_Z1 = 2000;
const MAP_Y = -60; // map face plane

// Plinth: stone-faced base with a stainless cap, and the two posts.
add("plinth", box(1820, 560, 160, true).translate(0, 0, 80).color(roofing));
add("plinth-cap", box(1860, 600, 30, true).translate(0, 0, 175).color(stainlessSteel));
for (const sx of [-1, 1]) {
  const side = sx > 0 ? "r" : "l";
  add(`post-${side}`, box(120, 120, 2200, true).translate(sx * PX, 0, 190 + 1100).color(paintedTimber));
  add(`post-collar-${side}`, box(160, 160, 60, true).translate(sx * PX, 0, 220).color(paintedTimber));
  add(`brace-${side}`, front([[sx * (PX - 60), 2180], [sx * (PX - 60), 2290], [sx * (PX - 230), 2290]], 80, -40).color(paintedTimber));
}

// Gabled shingle roof (ridge along X) with bargeboards on each gable end.
const ROOF = [[-560, 2260], [0, 2740], [560, 2260], [560, 2200], [0, 2670], [-560, 2200]];
add("roof", longSide(ROOF, 1900).color(roofing));
for (let k = 0; k < 3; k++) {
  const y = 160 + k * 130;
  const z = 2740 - (y / 560) * 480 + 8;
  for (const sy of [-1, 1]) add(`shingle-course-${k}-${sy > 0 ? "back" : "front"}`, box(1900, 20, 24, true).rotateX(sy * 40.6).translate(0, sy * y, z).color(roofing));
}
for (const sx of [-1, 1]) {
  add(`bargeboard-${sx > 0 ? "r" : "l"}`, longSide([[-600, 2240], [0, 2770], [600, 2240], [600, 2180], [0, 2700], [-600, 2180]], 30).translate(sx * 965, 0, 0).color(paintedTimber));
}
add("ridge-board", box(1960, 60, 50, true).translate(0, 0, 2750).color(paintedTimber));
add("header-board", box(1440, 60, 150, true).translate(0, -30, 2130).color(paintedTimber));
add("header-plate", box(900, 10, 90, true).translate(0, -62, 2130).color(stainlessSteel));

// Framed park map: backing, frame, lands, lake, winding path and you-are-here pin.
add("map-backing", box(2 * PX - 120, 40, MAP_Z1 - MAP_Z0, true).translate(0, MAP_Y + 50, (MAP_Z0 + MAP_Z1) / 2).color(paintedTimber));
add("map-print", front(rect(-PX + 90, MAP_Z0 + 30, PX - 90, MAP_Z1 - 30), 8, MAP_Y + 22).color(mapPrint));
add("map-frame", front(rect(-PX + 60, MAP_Z0, PX - 60, MAP_Z1), 30, MAP_Y + 30).subtract(front(rect(-PX + 90, MAP_Z0 + 30, PX - 90, MAP_Z1 - 30), 50, MAP_Y + 20)).color(paintedTimber));
const lake: [number, number][] = [];
for (let i = 0; i < 12; i++) {
  const a = (2 * Math.PI * i) / 12;
  lake.push([180 + 260 * Math.cos(a) * (1 + 0.15 * Math.sin(3 * a)), 1600 + 150 * Math.sin(a)]);
}
add("map-lake", front(lake, 6, MAP_Y + 16).color(water));
const pathPts: [number, number][] = [];
for (let i = 0; i <= 10; i++) {
  const t = i / 10;
  pathPts.push([-560 + 1120 * t, 1150 + 650 * t + 120 * Math.sin(t * Math.PI * 3)]);
}
const pathPoly = [...pathPts.map(([x, z]) => [x, z + 20]), ...pathPts.slice().reverse().map(([x, z]) => [x, z - 20])];
add("map-path", front(pathPoly, 6, MAP_Y + 15).color(stainlessSteel));
for (const [i, [x, z]] of [[-420, 1300], [-80, 1180], [420, 1250], [-380, 1800]].entries()) {
  add(`map-land-${i}`, front([[x - 90, z - 60], [x + 90, z - 60], [x + 60, z + 60], [x - 60, z + 60]], 5, MAP_Y + 16).color(i % 2 ? roofing : paintedTimber));
}
add("you-are-here-pin", cylinder(30, 40, 12).rotateX(-90).translate(-160, MAP_Y + 10, 1320).color(roofing));

// Slanted brochure rack below the map with pockets of folded guides.
add("rack-tray", box(1100, 300, 30, true).rotateX(25).translate(0, -230, 880).color(paintedTimber));
add("rack-lip", box(1100, 30, 90, true).translate(0, -370, 840).color(paintedTimber));
for (let k = 0; k < 4; k++) {
  const x = -410 + k * 273;
  add(`guide-${k}`, box(200, 14, 240, true).rotateX(-25).translate(x, -300, 960).color(k % 2 ? mapPrint : stainlessSteel));
}
for (const sx of [-1, 1]) add(`rack-bracket-${sx > 0 ? "r" : "l"}`, front([[sx * 560, 780], [sx * 560, 960], [sx * 580, 960], [sx * 580, 780]], 300, -380).color(paintedTimber));

return p.model();
