// SPDX-License-Identifier: CC0-1.0
// Game token counter: the midway booth where guests swap cash for game tokens.
// What makes it a token booth rather than a cabinet: a plank-faced counter
// with a projecting serving ledge, a glazed service window with a speak-hole
// and a cash slot, a funnel-topped token hopper heaped with coins, a sunken
// change tray, a big coin roundel sign over the window, and a striped sloping
// awning carried on two steel posts with scalloped flaps.
// Generic visualization geometry at about real size (about 2 m wide, 2.3 m
// to the sign), millimetres, Z up, serving side toward -Y, standing on z = 0.
meta({
  name: "game-token-counter",
  license: "CC0-1.0",
  title: "Game token counter",
  description: "Midway token exchange booth at about real size: plank-faced counter with a projecting serving ledge, glazed service window with speak-hole and cash slot, funnel token hopper heaped with coins, sunken change tray, coin roundel sign, and a striped sloping awning on two steel posts with scalloped flaps. Material controls: painted timber, steel, window glass, brass tokens and awning stripe. Classic, festival and twilight presets.",
  tags: ["token booth", "ticket booth", "cashier", "coins", "kiosk", "midway", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 5000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paintedTimber = param("paintedTimber", "#2f6d5a", { label: "Painted timber" });
const steel = param("steel", "#7d8689", { label: "Steel posts, hopper and tray" });
const glass = param("glass", "#9cc9d1", { label: "Window glass" });
const brass = param("brass", "#e2b33c", { label: "Brass tokens and awning stripe" });

presets({
  classic: { paintedTimber: "#2f6d5a", steel: "#7d8689", glass: "#9cc9d1", brass: "#e2b33c" },
  festival: { paintedTimber: "#b8432f", steel: "#a3aaa8", glass: "#c3e2e2", brass: "#f2c94c" },
  twilight: { paintedTimber: "#2c3e63", steel: "#56636a", glass: "#5f86a8", brass: "#d79a2b" },
});

const p = assembly("game-token-counter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 1600;
const D = 700;
const CH = 900;

// Plank-faced counter with plinth and ledge.
add("plinth", box(W - 40, D - 40, 80, true).translate(0, 0, 40).color(steel));
add("counter-body", box(W, D, CH - 80, true).translate(0, 0, 80 + (CH - 80) / 2).color(paintedTimber));
for (let k = 0; k < 9; k++) add(`plank-${k}`, box(W / 9 - 20, 16, CH - 160, true).translate(-W / 2 + (W / 9) * (k + 0.5), -D / 2 - 8, 80 + (CH - 80) / 2).color(k % 2 === 0 ? paintedTimber : steel));
add("ledge", box(W + 160, 420, 50, true).translate(0, -120, CH + 25).color(paintedTimber));
add("ledge-edge", box(W + 160, 30, 70, true).translate(0, -330, CH + 15).color(brass));

// Back wall with glazed service window.
const WZ = CH + 50;
add("back-wall-l", box(260, 80, 1100, true).translate(-W / 2 + 130, 200, WZ + 550).color(paintedTimber));
add("back-wall-r", box(260, 80, 1100, true).translate(W / 2 - 130, 200, WZ + 550).color(paintedTimber));
add("window-head", box(W, 80, 200, true).translate(0, 200, WZ + 1000).color(paintedTimber));
add("window-sill", box(W - 520, 80, 80, true).translate(0, 200, WZ + 40).color(paintedTimber));
add("window-glass", box(W - 520, 12, 820, true).subtract(cylinder(40, 70, 16).rotateX(90).translate(0, 20, 260)).subtract(box(260, 40, 50, true).translate(0, 0, -340)).translate(0, 190, WZ + 490).color(glass));
add("speak-ring", torus(70, 10, 16).rotateX(90).translate(0, 180, WZ + 750).color(steel));
add("cash-tray", box(320, 160, 30, true).translate(0, 120, WZ + 15).color(steel));

// Coin roundel sign standing above the awning.
const SZ = CH + 2080;
for (const sx of [-1, 1]) add(`sign-stem-${sx > 0 ? "r" : "l"}`, box(40, 40, 700, true).translate(sx * 180, 200, WZ + 1100 + 350).color(steel));
add("sign-disc", cylinder(40, 260, 28).rotateX(90).translate(0, 180, SZ).color(brass));
add("sign-rim", torus(240, 18, 28).rotateX(90).translate(0, 136, SZ).color(paintedTimber));
add("sign-mark", box(60, 10, 220, true).translate(0, 134, SZ).color(paintedTimber));
for (const dz of [-60, 60]) add(`sign-bar-${dz > 0 ? "t" : "b"}`, box(200, 10, 40, true).translate(0, 134, SZ + dz).color(paintedTimber));

// Token hopper with a heap of coins.
const HX = -480;
add("hopper-stand", cylinder(120, 70, 12).translate(HX, -120, CH + 50).color(steel));
add("hopper", turned([[0, 0], [70, 0], [70, 40], [220, 300], [220, 330], [200, 330], [60, 50], [0, 50]]).translate(HX, -120, CH + 170).color(steel));
add("coin-heap", turned([[0, 0], [205, 0], [140, 90], [0, 130]]).translate(HX, -120, CH + 480).color(brass));
for (let k = 0; k < 5; k++) add(`coin-stack-${k}`, cylinder(30 + k * 18, 28, 14).translate(HX + 230 + k * 70, -260, CH + 50).color(brass));

// Sunken change tray.
add("change-tray", box(420, 300, 60, true).subtract(box(380, 260, 60, true).translate(0, 0, 20)).translate(450, -160, CH + 80).color(steel));
for (let k = 0; k < 6; k++) add(`tray-coin-${k}`, cylinder(8, 26, 12).translate(340 + (k % 3) * 90, -220 + Math.floor(k / 3) * 110, CH + 70).color(brass));

// Striped sloping awning on two posts, with scalloped flaps.
for (const sx of [-1, 1]) add(`awning-post-${sx > 0 ? "r" : "l"}`, cylinder(1270, 30, 10).translate(sx * (W / 2 + 60), -330, CH + 50).color(steel));
const AZ = CH + 1320;
const BANDS = 8;
const bw = (W + 300) / BANDS;
for (let k = 0; k < BANDS; k++) add(`awning-band-${k}`, profileYZ([[-520, AZ], [240, AZ + 420], [240, AZ + 450], [-520, AZ + 30]], bw).translate(-(W + 300) / 2 + bw * (k + 0.5), 0, 0).color(k % 2 === 0 ? brass : paintedTimber));
for (let k = 0; k < BANDS; k++) {
  const flap = extrudePolygon([[-bw / 2, 0], [bw / 2, 0], [bw / 2, -80], [0, -170], [-bw / 2, -80]], 10).rotateX(90);
  add(`awning-flap-${k}`, flap.translate(-(W + 300) / 2 + bw * (k + 0.5), -515, AZ + 15).color(k % 2 === 0 ? paintedTimber : brass));
}

return p.model();
