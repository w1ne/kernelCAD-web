// Rotary blasthole drill rig, the crawler machine that drills the vertical
// holes an open-pit bench is blasted from. What makes it one: a tall lattice
// mast standing at the front of the machine with a rotary head riding on it and
// the drill pipe running down through a dust hood into the ground, a ring of
// cuttings around the collar; the machine itself a long deck on two crawler
// tracks with levelling jacks at the corners, a machinery house with radiator
// and exhaust, a glazed cab beside the mast, and raising cylinders and a pipe
// carousel on the mast. Millimetres, Z up, front (mast) towards +X.
meta({
  name: "rotary-blasthole-drill",
  license: 'CC0-1.0',
  title: "Rotary blasthole drill rig",
  description: "Rotary blasthole drill at about real size, drilling: 17 m lattice mast with crown sheaves, rotary head and drill pipe through a dust-collector skirt into the ground with a ring of cuttings at the collar, pipe carousel and raising cylinders; crawler tracks with sprockets, idlers and grousers, four levelling jacks, machinery house with louvres, radiator grille and exhaust stack, glazed cab, deck handrails and access ladder. Material controls: coated body steel, mast and frame steel, drill pipe steel, rubber and hoses; weathered, highVisibility and blueFleet presets.",
  tags: ['mining', 'open pit', 'blasthole drill', 'rotary drill', 'crawler', 'drill mast', 'drilling', 'blasting'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#e0a52a', { label: 'Coated body steel' });
const structuralSteel = param('structuralSteel', '#4c565c', { label: 'Mast and frame steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Drill pipe steel' });
const rubber = param('rubber', '#25292b', { label: 'Tracks, hoses and rubber' });
presets({
  weathered: { coatedSteel: '#9a7d45', structuralSteel: '#666a66', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', rubber: '#24282a' },
  blueFleet: { coatedSteel: '#2f62a8', structuralSteel: '#d8d4c8', stainlessSteel: '#b9c3c3', rubber: '#202326' },
});

const p = assembly("rotary-blasthole-drill");
// Modelled from the bench top; lift by the 60 mm ground patch so it sits on z = 0.
const add = (name, shape) => p.part(name, shape.translate(0, 0, 60).scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Closed (x, z) side profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const glass = '#2b4552', dark = '#1d2022', ground = '#8a7d6a', cuttings = '#a59a88';
const deckZ = 1700;
const mx = 3700; // mast centre line
const mastTop = 18500;

// ---- Bench ground patch, hole collar and cuttings ring ----
add('bench', blk(-5600, -3600, -60, 6600, 3600, 0).color(ground));
add('cuttings-ring', lathe([[1500, 0], [900, 260], [380, 330], [260, 300]], 16).translate(mx, 0, 0).color(cuttings));
add('hole-collar', rod(240, 300, 340, 12).translate(mx, 0, 0).color(dark));

// ---- Crawler tracks ----
const track = [[-4300, 250], [-4100, 0], [2700, 0], [3000, 300], [3000, 750], [2750, 1000], [-4050, 1000], [-4300, 750]];
for (const s of [-1, 1]) {
  const y = s * 1750;
  add(`track-${s}`, sideY(track, y - 380, y + 380).color(rubber));
  add(`track-frame-${s}`, blk(-3700, y - 260, 300, 2400, y + 260, 900).color(structuralSteel));
  add(`sprocket-${s}`, latheY([[470, y - 400], [470, y + 400]], -3750, 520, 12).color(structuralSteel));
  add(`idler-${s}`, latheY([[420, y - 400], [420, y + 400]], 2500, 520, 12).color(structuralSteel));
  for (let x = -3200; x <= 1900; x += 850) add(`track-roller-${s}-${x}`, latheY([[150, y - s * 400], [150, y + s * 440]].sort((a, b) => a[1] - b[1]), x, 200, 8).color(structuralSteel));
  for (let x = -3900; x <= 2600; x += 260) add(`grouser-${s}-${x}`, blk(x - 40, y - 390, 1000, x + 40, y + 390, 1050).color(rubber));
}
add('track-crossmember', blk(-2000, -1400, 700, 1000, 1400, 1100).color(structuralSteel));

// ---- Main deck and levelling jacks ----
add('main-frame', blk(-4500, -2300, 1100, 4400, 2300, deckZ).color(structuralSteel));
add('deck-plate', blk(-4500, -2350, deckZ, 4450, 2350, deckZ + 50).color(structuralSteel));
for (const [x, y] of [[-4100, -2050], [-4100, 2050], [4000, -2050], [4000, 2050]]) {
  add(`jack-cylinder-${x}-${y}`, rod(200, 900, deckZ, 10).translate(x, y, 0).color(coatedSteel));
  add(`jack-rod-${x}-${y}`, rod(120, 120, 900, 10).translate(x, y, 0).color(stainlessSteel));
  add(`jack-pad-${x}-${y}`, rod(420, 0, 120, 10).translate(x, y, 0).color(structuralSteel));
}

// ---- Machinery house with radiator and exhaust ----
add('machinery-house', sideY([[-4400, deckZ], [1000, deckZ], [1000, 4600], [-3900, 4600], [-4400, 4200]], -2200, 1000).color(coatedSteel));
add('house-roof', blk(-3950, -2250, 4600, 1050, 1050, 4700).color(coatedSteel));
add('radiator-grille', blk(-4430, -1900, deckZ + 600, -4380, 700, 3900).color(dark));
for (let z = deckZ + 700; z < 3900; z += 180) add(`grille-bar-${z}`, blk(-4460, -1900, z, -4420, 700, z + 50).color(structuralSteel));
for (let x = -3400; x <= 500; x += 600) {
  for (let k = 0; k < 4; k++) add(`louvre-${x}-${k}`, blk(x, -2240, 2700 + k * 260, x + 450, -2200, 2780 + k * 260).color(dark));
}
add('exhaust-stack', rod(130, 4700, 5900, 10).translate(-2600, -700, 0).color(dark));
add('exhaust-rain-cap', blk(-2780, -880, 5900, -2420, -520, 5950).color(dark));
add('air-cleaner', rod(300, 4700, 5300, 12).translate(-1200, -1200, 0).color(coatedSteel));

// ---- Cab beside the mast ----
const cy0 = 1000, cy1 = 2300;
add('cab-body', blk(1300, cy0, deckZ, 3000, cy1, deckZ + 1000).color(coatedSteel));
add('cab-glazing', sideY([[1350, deckZ + 1000], [3000, deckZ + 1000], [3150, deckZ + 2300], [1350, deckZ + 2300]], cy0 + 30, cy1 - 30).color(glass));
for (const [x, y] of [[1330, cy0], [1330, cy1 - 60], [3020, cy0], [3020, cy1 - 60]]) add(`cab-pillar-${x}-${y}`, blk(x - 30, y, deckZ + 1000, x + 60, y + 60, deckZ + 2300).color(coatedSteel));
add('cab-roof', blk(1250, cy0 - 50, deckZ + 2300, 3250, cy1 + 50, deckZ + 2450).color(coatedSteel));
add('cab-door-frame', blk(1700, cy1 - 10, deckZ + 80, 2500, cy1 + 30, deckZ + 2250).color(coatedSteel));
add('cab-door-glass', blk(1800, cy1 + 25, deckZ + 1100, 2400, cy1 + 40, deckZ + 2150).color(glass));
add('cab-beacon', rod(90, deckZ + 2450, deckZ + 2650, 8).translate(2200, 1650, 0).color('#e9a41c'));
add('cab-floodlight', blk(2900, cy0 + 300, deckZ + 2450, 3100, cy0 + 600, deckZ + 2650).color('#e8e3c9'));

// ---- Lattice mast ----
const half = 520;
const chords = [[mx - half, -half], [mx + half, -half], [mx + half, half], [mx - half, half]];
for (const [x, y] of chords) add(`mast-chord-${x}-${y}`, rod(90, deckZ, mastTop, 8).translate(x, y, 0).color(structuralSteel));
const bay = 1400;
for (let z = deckZ + 200, k = 0; z + bay <= mastTop; z += bay, k++) {
  for (let f = 0; f < 4; f++) {
    const a = chords[f], b = chords[(f + 1) % 4];
    const up = k % 2 === 0;
    add(`mast-lacing-${k}-${f}`, tube([a[0], a[1], z + (up ? 0 : bay)], [b[0], b[1], z + (up ? bay : 0)], 45, 6).color(structuralSteel));
    add(`mast-girt-${k}-${f}`, tube([a[0], a[1], z], [b[0], b[1], z], 40, 6).color(structuralSteel));
  }
}
add('mast-table', blk(mx - 900, -900, deckZ + 50, mx + 900, 900, deckZ + 450).color(coatedSteel));
add('mast-crown', blk(mx - 700, -700, mastTop, mx + 700, 700, mastTop + 450).color(coatedSteel));
add('crown-sheave-a', latheY([[330, -260], [330, -120]], mx - 200, mastTop + 650, 12).color(stainlessSteel));
add('crown-sheave-b', latheY([[330, 120], [330, 260]], mx - 200, mastTop + 650, 12).color(stainlessSteel));
// Raising cylinders from the deck to mid-mast: barrel low, chrome rod above.
for (const s of [-1, 1]) {
  const a = [300, s * 900, deckZ + 50], b = [mx - half, s * (half + 80), 9000];
  const m = [a[0] + (b[0] - a[0]) * 0.6, a[1] + (b[1] - a[1]) * 0.6, a[2] + (b[2] - a[2]) * 0.6];
  add(`mast-raise-cylinder-${s}`, tube(a, m, 170, 10).color(coatedSteel));
  add(`mast-raise-rod-${s}`, tube(m, b, 90, 8).color(stainlessSteel));
}

// ---- Rotary head, drill pipe, carousel and dust hood ----
const hz = 9800;
add('rotary-head', blk(mx - 650, -650, hz, mx + 650, 650, hz + 1100).color(coatedSteel));
add('rotary-motor-a', rod(260, hz + 1100, hz + 1800, 12).translate(mx - 300, -300, 0).color(structuralSteel));
add('rotary-motor-b', rod(260, hz + 1100, hz + 1800, 12).translate(mx + 300, 300, 0).color(structuralSteel));
add('rotary-swivel', rod(180, hz + 1100, hz + 1500, 10).translate(mx, 0, 0).color(stainlessSteel));
add('drill-pipe', rod(140, 300, hz, 12).translate(mx, 0, 0).color(stainlessSteel));
add('pipe-tool-joint', rod(175, hz - 500, hz, 12).translate(mx, 0, 0).color(stainlessSteel));
add('pipe-carousel-frame', blk(mx - 200, half + 100, deckZ + 1500, mx + 200, half + 300, deckZ + 11000).color(structuralSteel));
for (const [k, [dx, dy]] of [[-180, 420], [180, 420], [-180, 760], [180, 760]].entries()) {
  add(`carousel-pipe-${k}`, rod(130, deckZ + 1800, deckZ + 10600, 10).translate(mx + dx, half + dy, 0).color(stainlessSteel));
}
add('main-air-hose', tube([-500, -1100, 4700], [mx - 300, -300, hz + 1500], 90, 6).color(rubber));
add('hydraulic-hose-bundle', tube([1000, -900, deckZ + 200], [mx - half - 120, -half, 8500], 70, 6).color(rubber));
add('dust-skirt', lathe([[900, 380], [900, 1100]], 4).rotateZ(45).translate(mx, 0, 0).color(rubber));
add('dust-collector', blk(-500, -2300, deckZ - 900, 1200, -1700, deckZ - 100).color(coatedSteel));
add('dust-duct', tube([1200, -2000, deckZ - 500], [mx - 800, -600, 800], 160, 8).color(rubber));

// ---- Handrails and ladder ----
for (const [x0, y0, x1, y1] of [[-4400, 2300, 1200, 2300], [-4400, -2300, mx - 900, -2300], [mx + 1000, -2300, mx + 1000, 2300]]) {
  add(`handrail-${x0}-${y0}`, tube([x0, y0, deckZ + 1100], [x1, y1, deckZ + 1100], 30, 6).color(coatedSteel));
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 1500));
  for (let k = 0; k <= n; k++) add(`handrail-post-${x0}-${y0}-${k}`, rod(28, deckZ + 50, deckZ + 1100, 6).translate(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, 0).color(coatedSteel));
}
add('ladder-rail-a', tube([-1200, 2450, 300], [-1300, 2450, deckZ], 30, 6).color(coatedSteel));
add('ladder-rail-b', tube([-600, 2450, 300], [-700, 2450, deckZ], 30, 6).color(coatedSteel));
for (let k = 1; k < 5; k++) add(`ladder-rung-${k}`, blk(-1240 - k * 20, 2420, 300 + k * 280, -660 - k * 20, 2480, 330 + k * 280).color(coatedSteel));

return p.model();
