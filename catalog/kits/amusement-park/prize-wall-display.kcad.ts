// SPDX-License-Identifier: CC0-1.0
// Midway prize wall: the stepped wall of plush prizes behind a midway game's
// redemption counter, where winners point at the bear they want.
// What makes it a prize wall rather than a bookcase: a tall painted backboard
// under a scalloped header with marquee bulbs, two stepped prize shelves on
// steel brackets lined with plush bears (body, head, ears, muzzle) and prize
// balls, oversized "jumbo" bears hanging from hooks along the top, tier price
// placards under each shelf, and a striped redemption counter with a ticket
// ledge and ticket-counting machine in front.
// Generic visualization geometry at about real size (about 2.4 m wide, 2.9 m
// tall), millimetres, Z up, facing -Y, standing on z = 0.
meta({
  name: "prize-wall-display",
  license: "CC0-1.0",
  title: "Midway prize wall",
  description: "Midway prize wall at about real size: painted backboard with scalloped marquee header and bulbs, two stepped prize shelves on steel brackets lined with plush bears and prize balls, jumbo bears hanging from top hooks, tier price placards and a striped redemption counter with ticket ledge and ticket-counting machine. Material controls: painted timber, steel brackets and hooks, plush fabric, second plush colour and marquee bulbs. Classic, festival and twilight presets.",
  tags: ["prize wall", "plush", "teddy bear", "midway", "carnival game", "redemption counter", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 8000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paintedTimber = param("paintedTimber", "#c8423a", { label: "Painted timber" });
const steel = param("steel", "#738087", { label: "Steel brackets and hooks" });
const fabric = param("fabric", "#c98a4b", { label: "Plush fabric" });
const plushAlt = param("plushAlt", "#e889b0", { label: "Second plush colour" });
const bulb = param("bulb", "#fff1b8", { label: "Marquee bulbs and placards" });

presets({
  classic: { paintedTimber: "#c8423a", steel: "#738087", fabric: "#c98a4b", plushAlt: "#e889b0", bulb: "#fff1b8" },
  festival: { paintedTimber: "#2f7fb8", steel: "#c2c9c5", fabric: "#f0c24a", plushAlt: "#8bd17c", bulb: "#fff8e0" },
  twilight: { paintedTimber: "#4a2f6b", steel: "#5d6870", fabric: "#a4c8e8", plushAlt: "#e46a8f", bulb: "#ffd36b" },
});

const p = assembly("prize-wall-display");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Outline drawn in (x, z) and extruded t deep along Y, centred on y = 0;
// side profile drawn in (y, z) and extruded t wide along X.
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 2400;
const BACK_Y = 450;
const TOP = 2500;

// Backboard and scalloped marquee header with bulbs.
add("back-panel", box(W, 80, TOP, true).translate(0, BACK_Y, TOP / 2).color(paintedTimber));
const N_SC = 6;
const sw = W / N_SC;
const header: [number, number][] = [[-W / 2 - 50, 0], [W / 2 + 50, 0], [W / 2 + 50, 200]];
for (let k = N_SC - 1; k >= 0; k--) {
  const cx = -W / 2 + sw * (k + 0.5);
  for (let i = 1; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    header.push([cx + (sw / 2) * Math.cos(a), 200 + 120 * Math.sin(a)]);
  }
  if (k > 0) header.push([cx - sw / 2, 200]);
}
header.push([-W / 2 - 50, 200]);
add("header", profileXZ(header, 80).translate(0, BACK_Y - 60, TOP).color(bulb));
add("header-band", box(W + 120, 100, 120, true).translate(0, BACK_Y - 80, TOP + 60).color(paintedTimber));
for (let k = 0; k < 13; k++) add(`marquee-bulb-${k}`, sphere(30).translate(-W / 2 + 40 + k * ((W - 80) / 12), BACK_Y - 140, TOP + 60).color(bulb));

// Bear: body, head, ears and a muzzle facing -Y. Size s = 1 is a 300 mm bear.
const bear = (name: string, x: number, y: number, z: number, s: number, col: typeof fabric) => {
  add(`${name}-body`, sphere(100 * s).translate(x, y, z + 95 * s).color(col));
  add(`${name}-head`, sphere(75 * s).translate(x, y - 10 * s, z + 230 * s).color(col));
  for (const sx of [-1, 1]) add(`${name}-ear-${sx > 0 ? "r" : "l"}`, sphere(28 * s).translate(x + sx * 55 * s, y, z + 290 * s).color(col));
  add(`${name}-muzzle`, sphere(30 * s).translate(x, y - 75 * s, z + 215 * s).color(bulb));
};

// Two stepped shelves on steel brackets, stocked with bears and balls.
const shelves = [
  { z: 1000, d: 420 },
  { z: 1450, d: 320 },
];
shelves.forEach((s, i) => {
  const y0 = BACK_Y - 40 - s.d / 2;
  add(`shelf-${i}`, box(W - 100, s.d, 40, true).translate(0, y0, s.z).color(paintedTimber));
  add(`shelf-lip-${i}`, box(W - 100, 20, 60, true).translate(0, y0 - s.d / 2, s.z + 10).color(bulb));
  for (const bx of [-900, 0, 900]) add(`bracket-${i}-${bx}`, profileYZ([[0, 0], [0, 220], [-s.d + 40, 220]], 30).translate(bx, BACK_Y - 40, s.z - 240).color(steel));
  add(`placard-${i}`, box(280, 10, 90, true).translate(-W / 2 + 260, y0 - s.d / 2 - 10, s.z - 70).color(bulb));
  const n = 7 - i;
  for (let k = 0; k < n; k++) {
    const x = -W / 2 + 200 + ((W - 400) / (n - 1)) * k;
    if (k % 3 === 2) add(`prize-ball-${i}-${k}`, sphere(110).translate(x, y0, s.z + 130).color(k % 2 === 0 ? bulb : plushAlt));
    else bear(`bear-${i}-${k}`, x, y0, s.z + 20, 0.9 - i * 0.1, (k + i) % 2 === 0 ? fabric : plushAlt);
  }
});

// Jumbo bears hanging from hooks along the top.
for (let k = 0; k < 4; k++) {
  const x = -W / 2 + 300 + k * ((W - 600) / 3);
  add(`hook-${k}`, cylinder(160, 14, 8).rotateX(90).translate(x, BACK_Y - 40, TOP - 100).color(steel));
  add(`hook-tag-${k}`, cylinder(120, 6, 6).translate(x, BACK_Y - 180, TOP - 220).color(steel));
  bear(`jumbo-${k}`, x, BACK_Y - 240, TOP - 720, 1.65, k % 2 === 0 ? plushAlt : fabric);
}

// Striped redemption counter with a ticket ledge and counting machine.
const CY = -350;
const CH = 950;
const STRIPES = 8;
const stw = (W + 100) / STRIPES;
for (let k = 0; k < STRIPES; k++) add(`counter-stripe-${k}`, box(stw, 500, CH - 60, true).translate(-(W + 100) / 2 + stw * (k + 0.5), CY, (CH - 60) / 2 + 30).color(k % 2 === 0 ? paintedTimber : bulb));
add("counter-plinth", box(W + 100, 480, 30, true).translate(0, CY + 10, 15).color(steel));
add("counter-top", profileYZ([[-320, 0], [270, 0], [270, 60], [-290, 60], [-320, 30]], W + 160).translate(0, CY, CH - 60).color(paintedTimber));
add("ticket-ledge", box(900, 180, 30, true).translate(-500, CY - 330, CH - 160).color(steel));
for (const lx of [-850, -150]) add(`ledge-bracket-${lx}`, profileYZ([[0, 0], [0, 150], [-160, 150]], 20).translate(lx, CY - 250, CH - 325).color(steel));
add("ticket-counter-body", extrudeRoundedRect(320, 260, 30, 260, { axis: "y" }).translate(650, CY - 130, CH + 130).color(steel));
add("ticket-counter-slot", box(200, 20, 30, true).translate(650, CY - 140, CH + 120).color(paintedTimber));
add("ticket-counter-display", box(200, 10, 70, true).translate(650, CY - 140, CH + 200).color(bulb));
add("ticket-strip", box(60, 260, 4, true).rotateX(30).translate(650, CY - 250, CH + 55).color(fabric));

return p.model();
