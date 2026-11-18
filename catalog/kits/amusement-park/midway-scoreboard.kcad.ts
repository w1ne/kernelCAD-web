// SPDX-License-Identifier: CC0-1.0
// Midway scoreboard: the tall race board above a water-gun or derby game that
// shows each player's horse creeping toward the finish line.
// What makes it a midway race board rather than a sign: an arched marquee
// header ringed with chase bulbs, a cabinet face split into six numbered
// racing lanes with a horse token at a different distance in each, a
// chequered finish line and a winner lamp per lane, a side bell, and the whole
// board on twin steel legs with braced ballast feet.
// Generic visualization geometry at about real size (about 1.8 m wide, 2.6 m
// tall), millimetres, Z up, face toward -Y, standing on z = 0.
meta({
  name: "midway-scoreboard",
  license: "CC0-1.0",
  title: "Midway scoreboard",
  description: "Midway derby race scoreboard at about real size: arched marquee header ringed with chase bulbs, a cabinet face with six numbered racing lanes and a horse token in each, a chequered finish line with winner lamps, a side bell, on twin steel legs with braced ballast feet. Material controls: painted steel, cabinet enamel, lane acrylic, marquee bulbs. Classic, festival and twilight presets.",
  tags: ["scoreboard", "race board", "derby game", "marquee", "midway", "carnival game", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 6000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#3b4248", { label: "Painted steel frame" });
const enamel = param("enamel", "#c7362f", { label: "Cabinet and marquee enamel" });
const acrylic = param("acrylic", "#1f5f8b", { label: "Lane acrylic" });
const bulbs = param("bulbs", "#ffe9a0", { label: "Bulbs, tokens and lettering" });

presets({
  classic: { steel: "#3b4248", enamel: "#c7362f", acrylic: "#1f5f8b", bulbs: "#ffe9a0" },
  festival: { steel: "#5a6066", enamel: "#e39b2d", acrylic: "#6b3c8f", bulbs: "#fff6cf" },
  twilight: { steel: "#22282d", enamel: "#2f4f8a", acrylic: "#173041", bulbs: "#ffd36b" },
});

const p = assembly("midway-scoreboard");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
// Flat outline in (x, z) at depth y, extruded t toward -Y.
const faceXZ = (pts: [number, number][], t: number, y: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y, 0);

const W = 1600;
const Z0 = 900;
const H = 1150;
const D = 220;

// Legs with braced ballast feet.
for (const sx of [-1, 1]) {
  const s = sx > 0 ? "r" : "l";
  const x = sx * 620;
  add(`leg-${s}`, box(90, 90, Z0 + 40, true).translate(x, 0, (Z0 + 40) / 2 + 30).color(steel));
  add(`foot-${s}`, box(160, 760, 60, true).translate(x, 0, 30).color(steel));
  add(`ballast-${s}`, box(200, 180, 120, true).translate(x, 280, 120).color(enamel));
  for (const sy of [-1, 1]) add(`brace-${s}-${sy > 0 ? "b" : "f"}`, box(50, 400, 50, true).rotateX(sy * 45).translate(x, sy * 140, 200).color(steel));
}
add("leg-tie", box(1240, 60, 60, true).translate(0, 0, 420).color(steel));

// Cabinet.
add("cabinet", box(W, D, H, true).translate(0, 0, Z0 + H / 2).color(enamel));
add("face-panel", box(W - 120, 20, H - 120, true).translate(0, -D / 2 - 10, Z0 + H / 2).color(steel));

// Six racing lanes with numbers, tokens, finish line and winner lamps.
const LANES = 6;
const laneH = (H - 200) / LANES;
const progress = [0.82, 0.35, 0.6, 0.18, 0.5, 0.71];
const LX0 = -W / 2 + 200;
const LX1 = W / 2 - 220;
for (let k = 0; k < LANES; k++) {
  const z = Z0 + 100 + laneH * (k + 0.5);
  add(`lane-${k}`, box(LX1 - LX0, 14, laneH - 30, true).translate((LX0 + LX1) / 2, -D / 2 - 27, z).color(acrylic));
  add(`lane-number-${k}`, cylinder(10, laneH / 2 - 14, 14).rotateX(90).translate(LX0 - 70, -D / 2 - 20, z).color(bulbs));
  const tx = LX0 + 60 + (LX1 - LX0 - 160) * progress[k];
  const horse = faceXZ([[-55, -40], [35, -40], [40, -5], [70, 15], [80, 45], [55, 50], [30, 25], [-40, 25], [-60, 40], [-70, 30]], 24, -D / 2 - 34);
  add(`token-${k}`, horse.translate(tx, 0, z).color(bulbs));
  add(`winner-lamp-${k}`, sphere(34).translate(W / 2 - 110, -D / 2 - 30, z).color(k === 0 ? bulbs : steel));
}
for (let k = 0; k < 12; k++) add(`finish-check-${k}`, box(30, 10, laneH * LANES / 12, true).translate(LX1 - 25 + (k % 2) * 30, -D / 2 - 37, Z0 + 100 + (laneH * LANES / 12) * (k + 0.5)).color(k % 2 === 0 ? bulbs : steel));

// Arched marquee header with chase bulbs.
const HZ = Z0 + H;
const arch: [number, number][] = [];
const AN = 12;
for (let k = 0; k <= AN; k++) {
  const t = Math.PI - (k * Math.PI) / AN;
  arch.push([((W + 140) / 2) * Math.cos(t), 300 + 220 * Math.sin(t)]);
}
add("marquee", faceXZ([[-(W + 140) / 2, 0], [(W + 140) / 2, 0], ...arch.slice().reverse()], D, D / 2).translate(0, 0, HZ).color(enamel));
add("marquee-board", faceXZ([[-W / 2 + 60, 60], [W / 2 - 60, 60], [W / 2 - 60, 300], [0, 470], [-W / 2 + 60, 300]], 14, -D / 2).translate(0, 0, HZ).color(acrylic));
for (let k = 0; k < 7; k++) add(`title-letter-${k}`, box(110, 10, 150, true).translate(-480 + k * 160, -D / 2 - 18, HZ + 200).color(bulbs));
for (let k = 1; k < AN; k++) {
  const [x, z] = arch[k];
  add(`chase-bulb-${k}`, sphere(26).translate(x * 0.97, -D / 2 - 10, HZ + z - 10).color(bulbs));
}
for (let k = 0; k < 9; k++) add(`sill-bulb-${k}`, sphere(22).translate(-W / 2 + 40 + k * ((W - 80) / 8), -D / 2 - 10, HZ + 20).color(bulbs));

// Side bell.
add("bell-bracket", box(160, 40, 40, true).translate(W / 2 + 80, 0, HZ - 150).color(steel));
add("bell", path().moveTo(0, 0).lineTo(90, 0).lineTo(80, 30).lineTo(60, 110).lineTo(30, 140).lineTo(0, 140).close().revolve().translate(W / 2 + 140, 0, HZ - 320).color(bulbs));

return p.model();
