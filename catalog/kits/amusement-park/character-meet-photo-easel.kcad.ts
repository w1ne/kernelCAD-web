// SPDX-License-Identifier: CC0-1.0
// Character meet photo easel: the display beside a character meet-and-greet
// spot showing guests the souvenir photo they can buy.
// What makes it a photo easel rather than a sign board: a three-legged
// timber artist's easel (two splayed front legs and a hinged back leg) with
// a ledge across the front legs; a large sample photo in a moulded gilt
// frame leaning back on the ledge, showing a friendly cartoon bear waving in
// front of a sky backdrop with sparkles; and a small engraved caption
// plaque on the ledge.
// Generic visualization geometry at about real size (about 1.1 m wide,
// 0.9 m deep, 2.15 m tall), millimetres, Z up, photo facing -Y, standing on
// z = 0.
meta({
  name: "character-meet-photo-easel",
  license: "CC0-1.0",
  title: "Character meet photo easel",
  description: "Meet-and-greet souvenir photo display at about real size: three-legged timber artist's easel with splayed front legs, a hinged back leg and a front ledge, a large sample photo in a moulded gilt frame leaning on the ledge showing a waving cartoon bear on a sky backdrop with sparkles, and an engraved caption plaque. Material controls: sealed timber, gilt frame and plaque, photo backdrop, character print. Festival, twilight and storybook presets.",
  tags: ["photo easel", "easel", "photo display", "character meet", "meet and greet", "souvenir photo", "picture frame", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2200,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#8a6748", { label: "Sealed timber easel and ledge" });
const gilt = param("gilt", "#c9a246", { label: "Gilt frame and caption plaque" });
const photoBackdrop = param("photoBackdrop", "#7fc3e6", { label: "Photo print backdrop (sky)" });
const characterPrint = param("characterPrint", "#a8683a", { label: "Photo print character (bear)" });

presets({
  festival: { timber: "#be8a4e", gilt: "#e0b84f", photoBackdrop: "#f2a1b8", characterPrint: "#7a4a2a" },
  twilight: { timber: "#4d3f37", gilt: "#9fa8b0", photoBackdrop: "#35466f", characterPrint: "#c99a6a" },
  storybook: { timber: "#d8c39a", gilt: "#8a2f3a", photoBackdrop: "#bfe0b0", characterPrint: "#e0a03a" },
});

const p = assembly("character-meet-photo-easel");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const rect = (x0: number, z0: number, x1: number, z1: number) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const disc = (cx: number, cz: number, r: number, n = 14): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) pts.push([cx + r * Math.cos((2 * Math.PI * i) / n), cz + r * Math.sin((2 * Math.PI * i) / n)]);
  return pts;
};
const deg = (r: number) => (r * 180) / Math.PI;

// A leg is a 60 x 40 timber bar from a foot point up to a top point.
const TOP_Z = 2150;
const FOOT_Z = 30;
const leg = (foot: [number, number], top: [number, number]) => {
  const dz = TOP_Z - FOOT_Z;
  const len = Math.hypot(top[0] - foot[0], top[1] - foot[1], dz);
  return box(60, 40, len, true)
    .rotateY(deg(Math.atan((top[0] - foot[0]) / dz)))
    .rotateX(-deg(Math.atan((top[1] - foot[1]) / dz)))
    .translate((foot[0] + top[0]) / 2, (foot[1] + top[1]) / 2, (FOOT_Z + TOP_Z) / 2);
};

const FX = 480; // front foot spread
const FY = -300; // front foot plane
const BY = 600; // back foot
for (const sx of [-1, 1]) {
  const side = sx > 0 ? "r" : "l";
  add(`front-leg-${side}`, leg([sx * FX, FY], [sx * 110, 0]).color(timber));
  add(`front-foot-${side}`, cylinder(FOOT_Z + 10, 40, 10).translate(sx * FX, FY, 0).color(timber));
}
add("back-leg", leg([0, BY], [0, 40]).color(timber));
add("back-foot", cylinder(FOOT_Z + 10, 40, 10).translate(0, BY, 0).color(timber));
add("top-block", box(320, 90, 120, true).translate(0, 10, TOP_Z - 20).color(timber));
add("hinge-pin", cylinder(360, 14, 10).rotateY(90).translate(-180, 40, TOP_Z - 20).color(gilt));
add("spreader-chain", box(12, 520, 12, true).translate(0, 260, 900).color(gilt));

// Ledge across the front legs, with a lip and the caption plaque.
const LEDGE_Z = 720;
const legY = (z: number) => FY + ((0 - FY) * (z - FOOT_Z)) / (TOP_Z - FOOT_Z);
const LY = legY(LEDGE_Z) - 40;
add("ledge", box(1080, 150, 40, true).translate(0, LY - 35, LEDGE_Z).color(timber));
add("ledge-lip", box(1080, 25, 70, true).translate(0, LY - 100, LEDGE_Z + 30).color(timber));
add("caption-plaque", front(rect(-180, LEDGE_Z - 10, 180, LEDGE_Z + 55), 8, LY - 120).color(gilt));

// Sample photo leaning back on the ledge (built upright, then tilted).
const PW = 900;
const PH = 1200;
const LEAN = deg(Math.atan(-FY / (TOP_Z - FOOT_Z)));
const lean = (s: Shape) => s.rotateX(-LEAN).translate(0, LY - 50, LEDGE_Z + 20);
add("photo-backing", lean(box(PW, 20, PH, true).translate(0, 10, PH / 2)).color(timber));
add("photo-print", lean(front(rect(-PW / 2 + 70, 70, PW / 2 - 70, PH - 70), 6, -6)).color(photoBackdrop));
const frameOuter = front(rect(-PW / 2, 0, PW / 2, PH), 50, -40);
const frameInner = front(rect(-PW / 2 + 70, 70, PW / 2 - 70, PH - 70), 80, -60);
add("gilt-frame", lean(frameOuter.subtract(frameInner)).color(gilt));
add("frame-bead", lean(front(rect(-PW / 2 + 70, 60, PW / 2 - 70, 75), 12, -18)).color(gilt));
// The cartoon bear on the print: head with ears and muzzle, body, a waving arm.
const PRINT_Y = -12;
add("bear-body", lean(front(disc(-40, 360, 230, 16), 6, PRINT_Y)).color(characterPrint));
add("bear-head", lean(front(disc(-40, 720, 170, 16), 6, PRINT_Y - 2)).color(characterPrint));
for (const sx of [-1, 1]) add(`bear-ear-${sx > 0 ? "r" : "l"}`, lean(front(disc(-40 + sx * 135, 860, 60, 10), 6, PRINT_Y - 1)).color(characterPrint));
add("bear-muzzle", lean(front(disc(-40, 680, 70, 12), 4, PRINT_Y - 6)).color(gilt));
for (const sx of [-1, 1]) add(`bear-eye-${sx > 0 ? "r" : "l"}`, lean(front(disc(-40 + sx * 55, 770, 18, 8), 4, PRINT_Y - 6)).color(timber));
add("bear-nose", lean(front(disc(-40, 700, 24, 8), 4, PRINT_Y - 9)).color(timber));
add("bear-arm", lean(front([[110, 480], [170, 430], [330, 760], [270, 800]], 6, PRINT_Y - 1)).color(characterPrint));
add("bear-paw", lean(front(disc(300, 800, 55, 10), 6, PRINT_Y - 3)).color(characterPrint));
add("bear-belly", lean(front(disc(-40, 340, 120, 12), 4, PRINT_Y - 6)).color(gilt));
for (const [i, [x, z]] of [[-300, 980], [270, 1000], [-320, 560]].entries()) {
  const star: [number, number][] = [];
  for (let k = 0; k < 8; k++) {
    const r = k % 2 ? 18 : 50;
    star.push([x + r * Math.cos((Math.PI * k) / 4), z + r * Math.sin((Math.PI * k) / 4)]);
  }
  add(`sparkle-${i}`, lean(front(star, 4, PRINT_Y - 4)).color(gilt));
}

return p.model();
