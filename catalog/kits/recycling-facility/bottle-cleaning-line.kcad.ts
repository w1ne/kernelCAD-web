// SPDX-License-Identifier: CC0-1.0
// Bottle cleaning line: the tunnel washer that rinses returned glass and PET
// bottles before they are sorted or refilled. What makes it that machine
// rather than a plain conveyor: the bottles ride a slat belt through an
// arched stainless spray tunnel with strip curtains at both ends, a spray
// manifold with drop pipes runs along the roof, inspection windows line the
// front, and a recirculation tank and pump sit under the deck feeding the
// manifold. A control pedestal stands at the infeed.
// Generic visualization geometry at about real size (4.4 m long, 1.7 m
// high), millimetres, Z up, line runs along X with the front on -Y.

meta({
  name: "bottle-cleaning-line",
  license: 'CC0-1.0',
  title: "Bottle cleaning line",
  description: "Bottle tunnel washer at about real size: slat belt on a six-leg frame, arched stainless spray tunnel with strip curtains and front inspection windows, roof spray manifold with drop pipes, recirculation tank and pump under the deck, guided infeed and outfeed lanes carrying bottles, and a control pedestal. Material controls: frame paint, stainless tunnel, belt rubber and bottle glass. plant, weathered, petLine and foodGrade presets.",
  tags: ["recycling", "bottle washer", "tunnel washer", "glass", "pet bottles", "conveyor", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6f8f', { label: 'Frame and tank (painted steel)' });
const stainless = param('stainless', '#c3cacc', { label: 'Spray tunnel and guides (stainless)' });
const belt = param('belt', '#2c3133', { label: 'Slat belt and curtains (rubber)' });
const bottleGlass = param('bottleGlass', '#3f8a55', { label: 'Bottle glass' });

presets({
  plant: { frame: '#2f6f8f', stainless: '#c3cacc', belt: '#2c3133', bottleGlass: '#3f8a55' },
  weathered: { frame: '#4f5e63', stainless: '#a2a7a3', belt: '#3a3d3c', bottleGlass: '#6a7f52' },
  petLine: { frame: '#3a3f44', stainless: '#d0d6d8', belt: '#1f5f9f', bottleGlass: '#9fd1e6' },
  foodGrade: { frame: '#e6e8e6', stainless: '#d8dddf', belt: '#2a6fb0', bottleGlass: '#8a5a2b' },
});

const p = assembly("bottle-cleaning-line");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// A (y, z) cross-section extruded along X over length t, centred on x = 0.
const profileYZ = (pts: number[][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const L = 4400, DECK = 950, BW = 520;

// Six-leg frame with feet, side stringers and a cross tie at each leg pair.
for (const x of [-2000, 0, 2000]) for (const s of [-1, 1]) {
  add(`leg-${x}-${s}`, blk(x, s * 300, 0, 80, 80, DECK - 60).color(frame));
  add(`foot-${x}-${s}`, blk(x, s * 300, 0, 160, 160, 20).color(stainless));
}
for (const s of [-1, 1]) add(`stringer-${s}`, blk(0, s * 300, DECK - 140, L, 70, 140).color(frame));
for (const x of [-2000, 0, 2000]) add(`cross-tie-${x}`, blk(x, 0, 300, 60, 600, 60).color(frame));

// Slat belt over head and tail pulleys.
add("belt", blk(0, 0, DECK, L - 120, BW, 30).color(belt));
for (const x of [-L / 2 + 60, L / 2 - 60]) add(`pulley-${x}`, cylinder(BW + 40, 75, 14).rotateX(90).translate(x, (BW + 40) / 2, DECK - 45).color(stainless));
add("drive-gearbox", blk(L / 2 - 60, -BW / 2 - 140, DECK - 200, 220, 160, 220).color(frame));
add("drive-motor", cylinder(320, 95, 14).rotateY(-90).translate(L / 2 - 170, -BW / 2 - 140, DECK - 90).color(frame));

// Arched spray tunnel (hollow inverted U) with strip curtains at each mouth.
const TL = 2400;
add("tunnel", profileYZ([[-380, DECK - 40], [-380, 1450], [-260, 1620], [260, 1620], [380, 1450], [380, DECK - 40], [345, DECK - 40], [345, 1435], [240, 1585], [-240, 1585], [-345, 1435], [-345, DECK - 40]], TL).color(stainless));
for (const s of [-1, 1]) for (let k = 0; k < 6; k++) add(`curtain-${s}-${k}`, blk(s * (TL / 2 - 10), -300 + 60 + k * 96, 1060, 6, 84, 500).color(belt));
for (const x of [-800, 0, 800]) {
  add(`window-${x}`, blk(x, -385, 1150, 520, 12, 240).color('#2a3a44'));
  add(`window-frame-${x}`, blk(x, -392, 1130, 580, 8, 20).color(stainless));
}

// Roof spray manifold with drop pipes into the tunnel, fed from the pump.
add("manifold", cylinder(TL - 200, 45, 10).rotateY(90).translate(-TL / 2 + 100, -120, 1690).color(stainless));
for (let k = 0; k < 7; k++) add(`drop-${k}`, cylinder(130, 22, 8).translate(-TL / 2 + 300 + k * 300, -120, 1580).color(stainless));
add("manifold-end-cap", sphere(55).translate(-TL / 2 + 100, -120, 1690).color(stainless));

// Recirculation tank and pump under the deck, riser up to the manifold.
add("wash-tank", blk(0, 0, 160, 1700, 520, 520).color(frame));
add("tank-lid", blk(0, 0, 680, 1760, 560, 30).color(stainless));
add("pump-volute", cylinder(160, 140, 14).rotateX(90).translate(1150, -120, 290).color(frame));
add("pump-motor", cylinder(300, 110, 14).rotateY(90).translate(1150, -200, 290).color(frame));
add("pump-plinth", blk(1300, -200, 0, 520, 320, 150).color('#8d8f8a'));
add("riser", cylinder(1300, 40, 10).translate(1150, -350, 390).color(stainless));
add("riser-elbow", sphere(55).translate(1150, -350, 1690).color(stainless));
add("riser-run", cylinder(1150 - TL / 2 + 100 + 10, 40, 10).rotateY(-90).translate(1150, -350, 1690).color(stainless));
add("riser-tee", cylinder(230, 40, 10).rotateX(-90).translate(TL / 2 - 100, -350, 1690).color(stainless));

// Guided infeed and outfeed lanes with two rows of bottles on each.
for (const s of [-1, 1]) for (const g of [-1, 0, 1]) add(`guide-${s}-${g}`, blk(s * (TL / 2 + 520), g * 170, DECK + 150, 980, 14, 30).color(stainless));
for (const s of [-1, 1]) for (const g of [-1, 1]) for (const yp of [-1, 1]) add(`guide-post-${s}-${g}-${yp}`, blk(s * (TL / 2 + 520) + g * 420, yp * (BW / 2 + 30), DECK - 60, 30, 30, 260).color(stainless));
for (const s of [-1, 1]) for (const yp of [-1, 1]) add(`guide-arm-${s}-${yp}`, blk(s * (TL / 2 + 520), yp * (BW / 2 + 30), DECK + 160, 980, 20, 20).color(stainless));
const bottle = turned([[0, 0], [38, 0], [38, 150], [13, 215], [13, 245], [0, 245]]);
for (const s of [-1, 1]) for (const row of [-1, 1]) for (let k = 0; k < 4; k++) {
  add(`bottle-${s}-${row}-${k}`, bottle.translate(s * (TL / 2 + 180 + k * 220), row * 85, DECK + 30).color(bottleGlass));
}

// Control pedestal at the infeed, front side.
add("pedestal-post", blk(-L / 2 + 300, -720, 0, 90, 90, 1150).color(frame));
add("pedestal-base", blk(-L / 2 + 300, -720, 0, 320, 320, 20).color(frame));
add("control-box", blk(-L / 2 + 300, -720, 1150, 420, 200, 340).color(stainless));
add("hmi-screen", blk(-L / 2 + 270, -822, 1290, 240, 6, 150).color('#1d2a33'));
add("e-stop", cylinder(30, 32, 12).rotateX(90).translate(-L / 2 + 450, -820, 1220).color('#c8312b'));

return p.model();
