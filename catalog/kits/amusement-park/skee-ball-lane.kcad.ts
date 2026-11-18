// SPDX-License-Identifier: CC0-1.0
// Skee-ball lane: the arcade alley where you roll a wooden ball up a long
// incline, hop it off a hump and drop it into a scoring ring.
// What makes it a skee-ball lane rather than a ramp: a long maple lane
// rising gently away from the player inside a cabinet with tall shaped
// sides, the jump hump at the top of the lane, a tilted target bowl of
// concentric scoring rings with pocket holes, wire guard rails above the
// lane, a ball-return trough at the player end holding balls, and a tilted
// scoreboard on the backboard.
// Generic visualization geometry at about real size (3.2 m long, 0.8 m
// wide, 2.4 m to the scoreboard), millimetres, Z up, player end on -Y,
// standing on z = 0.
meta({
  name: "skee-ball-lane",
  license: "CC0-1.0",
  title: "Skee-ball lane",
  description: "Arcade skee-ball alley at about real size: a long maple lane rising away from the player inside a shaped cabinet, the jump hump, a tilted target bowl of concentric scoring rings with pocket holes, wire guard rails, a ball-return trough holding balls at the player end, and a tilted scoreboard on the backboard. Material controls: cabinet laminate, maple lane, enamel rings, dark steel. Arcade, retro and neon presets.",
  tags: ["skee-ball", "skee ball", "alley roller", "ball roll game", "arcade game", "redemption game", "midway game", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "arcade", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const cabinet = param("cabinet", "#c8322f", { label: "Cabinet laminate sides and backboard" });
const maple = param("maple", "#d9a868", { label: "Maple lane, hump and balls" });
const enamel = param("enamel", "#f2c230", { label: "Enamel scoring rings and scoreboard trim" });
const steel = param("steel", "#2c3136", { label: "Dark steel rails, pockets and scoreboard face" });

presets({
  arcade: { cabinet: "#1f5fae", maple: "#dcae70", enamel: "#ffd23a", steel: "#25292e" },
  retro: { cabinet: "#6b3a22", maple: "#c99456", enamel: "#e8e0c8", steel: "#3a3631" },
  neon: { cabinet: "#22163f", maple: "#c9a072", enamel: "#3cf0d0", steel: "#151320" },
});

const p = assembly("skee-ball-lane");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t thick along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Flat ring lying in XY, h tall.
const ring = (R: number, r: number, h: number) => cylinder(h, R, 28).subtract(cylinder(h + 40, r, 28).translate(0, 0, -20));

const W = 800;
const Y0 = -1600;
const Y1 = 500;
const Z0 = 760;
const Z1 = 920;
const SLOPE = Math.atan2(Z1 - Z0, Y1 - Y0) * (180 / Math.PI);

// Shaped cabinet sides: low along the lane, rising to a tall backboard.
for (const sx of [-1, 1]) {
  const side = profileYZ([[Y0, 0], [1550, 0], [1550, 2450], [1250, 2450], [1050, 1500], [Y1, Z1 + 150], [Y0, Z0 + 150]], 40);
  add(`cabinet-side-${sx > 0 ? "r" : "l"}`, side.translate(sx * (W / 2 + 20), 0, 0).color(cabinet));
}
add("cabinet-front", face([[-W / 2, 0], [W / 2, 0], [W / 2, Z0 - 120], [-W / 2, Z0 - 120]], 30, Y0).color(cabinet));
add("backboard", face([[-W / 2, 0], [W / 2, 0], [W / 2, 2450], [-W / 2, 2450]], 40, 1510).color(cabinet));

// Maple lane rising away from the player, with the jump hump at the top.
add("lane", profileYZ([[Y0, Z0 - 30], [Y1, Z1 - 30], [Y1, Z1], [Y0, Z0]], W - 160).color(maple));
add("lane-skirt", profileYZ([[Y0 + 30, 0], [Y1, 0], [Y1, Z1 - 30], [Y0 + 30, Z0 - 30]], W - 200).color(cabinet));
const hump: [number, number][] = [];
for (let k = 0; k <= 8; k++) {
  const a = Math.PI - (k / 8) * Math.PI;
  hump.push([Y1 + 100 + Math.cos(a) * 160, Z1 - 10 + Math.sin(a) * 90]);
}
add("jump-hump", profileYZ(hump, W - 160).color(maple));
add("bowl-floor", profileYZ([[Y1 + 260, Z1 - 40], [1510, 1300], [1510, 1340], [Y1 + 260, Z1]], W - 80).color(cabinet));

// Ball-return trough at the player end, full of balls.
add("return-trough", plan([[-W / 2 + 20, Y0 - 240], [W / 2 - 20, Y0 - 240], [W / 2 - 20, Y0], [-W / 2 + 20, Y0]], Z0 - 260, 40).color(steel));
add("trough-lip", face([[-W / 2 + 20, Z0 - 260], [W / 2 - 20, Z0 - 260], [W / 2 - 20, Z0 - 140], [-W / 2 + 20, Z0 - 140]], 20, Y0 - 260).color(steel));
for (let k = 0; k < 6; k++) add(`ball-${k}`, sphere(48).translate(-W / 2 + 90 + k * 110, Y0 - 120, Z0 - 172).color(maple));
for (const sx of [-1, 1]) add(`trough-bracket-${sx > 0 ? "r" : "l"}`, profileYZ([[Y0, Z0 - 420], [Y0, Z0 - 220], [Y0 - 240, Z0 - 220]], 30).translate(sx * (W / 2 - 40), 0, 0).color(steel));

// Wire guard cage above the lane: posts on the side walls carrying rails
// that follow the lane slope.
const wallTop = (y: number) => Z0 + 150 + ((y - Y0) * (Z1 - Z0)) / (Y1 - Y0);
for (const sx of [-1, 1]) {
  const s = sx > 0 ? "r" : "l";
  for (const y of [Y0 + 60, -550, Y1 - 60]) add(`guard-post-${s}-${y}`, cylinder(340, 14, 8).translate(sx * (W / 2 + 20), y, wallTop(y)).color(steel));
  for (const dz of [180, 340]) {
    const len = Math.hypot(Y1 - Y0 - 120, Z1 - Z0);
    add(`guard-rail-${s}-${dz}`, cylinder(len, 12, 8).rotateX(-90 + SLOPE).translate(sx * (W / 2 + 20), Y0 + 60, wallTop(Y0 + 60) + dz).color(steel));
  }
}

// Target bowl: concentric scoring rings on a tilted backing, pocket holes.
const tilt = (s: Shape) => s.rotateX(42).translate(0, 1220, 1500);
add("target-backing", tilt(cylinder(40, W / 2 - 20, 32).translate(0, 0, -40)).color(steel));
add("ring-outer", tilt(ring(W / 2 - 20, W / 2 - 70, 140)).color(enamel));
add("ring-mid", tilt(ring(250, 210, 110)).color(enamel));
add("ring-inner", tilt(ring(150, 115, 80)).color(enamel));
add("ring-cup", tilt(ring(70, 50, 60)).color(enamel));
add("pocket-centre", tilt(cylinder(12, 48, 16)).color(steel));
add("pocket-top", tilt(cylinder(12, 34, 16).translate(0, 290, 0)).color(steel));

// Tilted scoreboard on the backboard.
add("scoreboard", face([[-W / 2 + 20, 0], [W / 2 - 20, 0], [W / 2 - 20, 380], [-W / 2 + 20, 380]], 60, -60).rotateX(-12).translate(0, 1450, 1900).color(enamel));
add("score-window", face([[-280, 90], [280, 90], [280, 290], [-280, 290]], 12, -72).rotateX(-12).translate(0, 1450, 1900).color(steel));
for (let k = 0; k < 4; k++) add(`score-digit-${k}`, face([[-40, 0], [40, 0], [40, 140], [-40, 140]], 6, -78).rotateX(-12).translate(-195 + k * 130, 1450, 2010).color(enamel));

return p.model();
