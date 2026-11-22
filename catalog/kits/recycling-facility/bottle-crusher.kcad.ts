// SPDX-License-Identifier: CC0-1.0
// Bottle crusher: the compact glass-bottle crusher that a bar, hotel or
// drop-off point uses to cut bottle volume by about 80% before collection.
// What makes it that machine rather than an industrial glass crusher: a
// fridge-sized stainless cabinet on castors; a round rubber-flapped feed
// port on top that takes one bottle at a time; a crushing head and motor
// housing in the top section; and a front door that opens to show an
// ordinary wheelie bin standing inside, filling with crushed glass.
// Generic visualization geometry at about real size (0.75 m wide, 0.7 m
// deep, 1.45 m high), millimetres, Z up, door toward -Y.

meta({
  name: "bottle-crusher",
  license: 'CC0-1.0',
  title: "Bottle crusher",
  description: "Compact bar and hotel glass-bottle crusher at about real size: stainless cabinet on castors, rubber-flapped round feed port on top, crushing head housing with control panel and e-stop, front door hinged open (or closed) showing a wheelie bin inside filling with crushed glass. Material controls: cabinet steel, accent panels, wheelie bin, crushed glass. stainless, black, red and weathered presets; door open or closed.",
  tags: ["recycling", "bottle crusher", "glass crusher", "bar equipment", "hospitality", "cullet", "glass recycling", "wheelie bin", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#c4c9cc', { label: 'Cabinet (stainless steel)' });
const accent = param('accent', '#2b5f9e', { label: 'Head and door panels (accent)' });
const bin = param('bin', '#2e6b3a', { label: 'Wheelie bin (plastic)' });
const cullet = param('cullet', '#5b9a5e', { label: 'Crushed glass' });
const door = param('door', 'open', { choices: ['open', 'closed'], label: 'Front door' });

presets({
  stainless: { cabinet: '#c4c9cc', accent: '#2b5f9e', bin: '#2e6b3a', cullet: '#5b9a5e' },
  black: { cabinet: '#2b2f33', accent: '#c4c9cc', bin: '#3a3f44', cullet: '#a9c9c4' },
  red: { cabinet: '#c4c9cc', accent: '#c2342b', bin: '#2e6b3a', cullet: '#8a5a2a' },
  weathered: { cabinet: '#9a9d98', accent: '#5f7058', bin: '#4b5a46', cullet: '#7a8a6e' },
});

const p = assembly("bottle-crusher");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();

const W = 750, D = 700, ZB = 90, ZH = 1060, H = 1450; // width, depth, body bottom, head split, top
const isOpen = door.value === 'open';
const swing = (s: Shape) => (isOpen ? s.translate(-W / 2, D / 2, 0).rotateZ(105).translate(W / 2, -D / 2, 0) : s);

// Cabinet: open-fronted bin bay below, crushing head section above.
add("cabinet", blk(0, 0, ZB, W, D, ZH - ZB).subtract(blk(0, -40, ZB + 30, W - 50, D, ZH - ZB - 60)).color(cabinet));
add("head", blk(0, 0, ZH, W, D, H - ZH - 40).color(accent));
add("top-plate", blk(0, 20, H - 40, W + 20, D - 20, 40).color(cabinet));
add("top-nose", cylinder(W + 20, 20, 10).rotateY(90).translate(-(W + 20) / 2, -D / 2 + 20, H - 20).color(cabinet));
add("plinth", blk(0, 0, ZB - 20, W - 40, D - 40, 20).color('#3a3f44'));
for (const [x, y] of [[-300, -270], [300, -270], [-300, 270], [300, 270]]) {
  add(`castor-fork-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 40, 50, 60, 30).color('#3a3f44'));
  add(`castor-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, cylinder(30, 42, 10).rotateY(90).translate(x - 15, y, 40).subtract(blk(x, y, -60, 80, 120, 60)).color('#1d2023'));
}

// Rubber-flapped feed port, raised on a collar, with a bottle going in.
add("feed-collar", cylinder(70, 150, 18).translate(-80, -60, H).color(cabinet));
add("feed-flap", cylinder(8, 128, 18).translate(-80, -60, H + 70).color('#1d2023'));
for (let k = 0; k < 4; k++) add(`flap-slit-${k}`, blk(0, 0, 0, 250, 6, 4).rotateZ(k * 45).translate(-80, -60, H + 76).color('#4a4f53'));
add("bottle", cylinder(170, 38, 10).union(cylinder(70, 15, 8).translate(0, 0, 170)).rotateX(-35).translate(-80, -60, H + 40).color('#2f7a3e'));

// Control panel on the head front: display, start, e-stop and bin-full lamp.
add("panel", blk(160, -D / 2 - 6, ZH + 90, 300, 6, 230).color('#20262b'));
add("display", blk(110, -D / 2 - 9, ZH + 220, 140, 4, 60).color('#7fc2e0'));
add("start-button", cylinder(10, 22, 10).rotateX(90).translate(240, -D / 2 - 6, ZH + 250).color('#3fa64a'));
add("e-stop", cylinder(22, 34, 12).rotateX(90).translate(240, -D / 2 - 6, ZH + 150).color('#d43a2f'));
add("bin-full-lamp", cylinder(12, 16, 10).rotateX(90).translate(110, -D / 2 - 6, ZH + 150).color('#f0ae32'));
for (let i = 0; i < 6; i++) add(`vent-${i}`, blk(-200, -D / 2 - 3, ZH + 110 + i * 34, 220, 4, 14).color('#20262b'));

// Front door hinged on its +X edge, with a window strip and handle.
add("door", swing(blk(0, -D / 2 - 15, ZB + 20, W - 10, 20, ZH - ZB - 30)).color(accent));
add("door-window", swing(blk(0, -D / 2 - 27, ZB + 520, W - 200, 4, 200)).color('#1d2023'));
add("door-handle", swing(blk(-W / 2 + 70, -D / 2 - 45, ZB + 350, 30, 30, 260)).color(cabinet));
add("door-label", swing(blk(0, -D / 2 - 27, ZB + 200, 340, 4, 140)).color('#e9ece8'));
for (const z of [ZB + 120, ZH - 120]) add(`hinge-${z}`, cylinder(80, 16, 8).translate(W / 2 + 4, -D / 2 - 10, z - 40).color(cabinet));

// Wheelie bin standing in the bay, heaped with crushed glass.
const BZ = ZB + 40, BH = 820;
const tub = rectPath(230, 240).loft(rectPath(270, 290), { spacing: BH, ruled: true }).translate(0, 30, BZ);
const tubIn = rectPath(212, 222).loft(rectPath(256, 276), { spacing: BH + 20, ruled: true }).translate(0, 30, BZ + 30);
add("wheelie-bin", tub.subtract(tubIn).color(bin));
add("bin-rim", blk(0, 30, BZ + BH - 40, 560, 600, 40).subtract(blk(0, 30, BZ + BH - 50, 512, 552, 60)).color(bin));
add("bin-handle", blk(0, 330, BZ + BH - 120, 400, 40, 40).color(bin));
add("glass-heap", sphere(250).scale([1.0, 1.05, 0.45]).translate(0, 30, BZ + BH - 60).subtract(blk(0, 30, 0, 700, 700, BZ + BH - 100)).color(cullet));
for (let i = 0; i < 9; i++) add(`shard-${i}`, box(40, 28, 10, true).rotateZ(i * 47).rotateX(20).translate(-160 + i * 40, -40 + 70 * Math.sin(i * 2.3), BZ + BH + 30).color(cullet));
add("bin-wheel-l", cylinder(40, 90, 12).rotateY(90).translate(-260, 260, BZ + 70).color('#1d2023'));
add("bin-wheel-r", cylinder(40, 90, 12).rotateY(90).translate(220, 260, BZ + 70).color('#1d2023'));

return p.model();
