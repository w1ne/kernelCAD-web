// SPDX-License-Identifier: CC0-1.0
// Grizzly scalping deck, a vibrating grizzly feeder that sits ahead of the
// primary crusher and lets the fines drop out before the crusher sees them.
// What makes it one: a long steel tray on coil springs, sloping gently down
// to its discharge lip, with a plain liner pan under the feed end followed by
// two stepped decks of heavy parallel grizzly bars. Gaps between the bars
// let the undersize fall into a fines chute below; oversize boulders walk
// along the bars and over the lip to the crusher. Two unbalanced vibrator
// motors on the side plates shake the whole tray.
// Millimetres, Z up, feed end at +X, discharge lip at -X towards the viewer,
// vibrator motors on both side plates.
meta({
  name: "grizzly-scalping-deck",
  license: 'CC0-1.0',
  title: "Grizzly scalping deck",
  description: "Vibrating grizzly feeder at about real size: sloping tray with shaped side plates, stiffeners and top flanges, a manganese liner pan under the feed end, two stepped decks of heavy grizzly bars on cross beams, twin unbalanced vibrator motors on the side plates, four coil-spring sets on spring brackets and steel pedestals, a fines chute under the bars, ore on the feed pan and oversize boulders on the bars. Material controls: tray coating, support steel, manganese bars and liners, and ore, plus a bar gap choice (75, 100 or 150 mm) that sets the number of grizzly bars. weathered, highVisibility and orangePlant presets.",
  tags: ['mining', 'mineral processing', 'screening', 'grizzly', 'vibrating grizzly feeder', 'scalping', 'crusher feed', 'crushing plant'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3a78a8', { label: 'Tray coating' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Support steel' });
const manganeseSteel = param('manganeseSteel', '#8d918e', { label: 'Manganese bars and liners' });
const ore = param('ore', '#8a7d6c', { label: 'Ore' });
const barGap = param('barGap', '100 mm', { choices: ['75 mm', '100 mm', '150 mm'], label: 'Grizzly bar gap' });
presets({
  weathered: { coatedSteel: '#56707f', structuralSteel: '#666a66', manganeseSteel: '#77706a', ore: '#7d7062' },
  highVisibility: { coatedSteel: '#f0a81c', structuralSteel: '#465159', manganeseSteel: '#a2a7a4', ore: '#9a8b78' },
  orangePlant: { coatedSteel: '#d9831f', structuralSteel: '#2d3134', manganeseSteel: '#9a9f9c', ore: '#6f4a3a' },
});

const p = assembly("grizzly-scalping-deck");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
// (x, z) outline extruded along Y, centred on y = 0.
const profileXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (x0, x1, y0, y1) => path().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).close();

const oreDark = '#6f6457', dark = '#1e2123', warn = '#e8c21e';
const gap = { '75 mm': 75, '100 mm': 100, '150 mm': 150 }[barGap.value];
const L = 6500, B = 900, T = 40; // tray length, inner half-width, plate
const TILT = 5, Zd = 1900; // tray slope (degrees) and height of the discharge lip
const sa = Math.sin((TILT * Math.PI) / 180), ca = Math.cos((TILT * Math.PI) / 180);
// Tray parts are built level in local coordinates (x along the tray, z = 0 at
// the feed pan surface) and lifted onto the springs with one helper.
const D = (s) => s.rotateY(-TILT).translate(0, 0, Zd);
const world = (x, z) => [x * ca - z * sa, Zd + x * sa + z * ca];

// ---- Tray: side plates, stiffeners, back plate ----
const topZ = (x) => -60 + (440 * x) / (L - 1800); // side plate top edge, low at the lip so the bars show
const side = [[0, -520], [L, -520], [L, 1250], [L - 1300, 1250], [L - 1800, topZ(L - 1800)], [0, topZ(0)]];
for (const [k, s] of [-1, 1].entries()) {
  add(`side-plate-${k}`, D(profileXZ(side, T).translate(0, s * (B + T / 2), 0)).color(coatedSteel));
  add(`top-flange-${k}`, D(profileXZ([[0, topZ(0)], [L - 1800, topZ(L - 1800)], [L - 1800, topZ(L - 1800) + 50], [0, topZ(0) + 50]], 160).translate(0, s * (B + 80), 0)).color(coatedSteel));
  for (const [j, x] of [700, 1800, 2900, 4000, 5200].entries()) {
    add(`stiffener-${k}-${j}`, D(blk(x - 35, s > 0 ? B + T : -B - T - 90, -520, x + 35, s > 0 ? B + T + 90 : -B - T, topZ(x))).color(coatedSteel));
  }
  add(`bottom-flange-${k}`, D(blk(0, s > 0 ? B : -B - 140, -560, L, s > 0 ? B + 140 : -B, -520)).color(coatedSteel));
}
add('back-plate', D(blk(L - 40, -B - T, -520, L + 20, B + T, 1250)).color(coatedSteel));

// ---- Feed pan with liners ----
const Xp = 3700;
add('feed-pan', D(blk(Xp, -B, -60, L - 40, B, 0)).color(coatedSteel));
for (let i = 0; i < 4; i++) {
  const x0 = Xp + 40 + (i * (L - Xp - 120)) / 4;
  add(`pan-liner-${i}`, D(blk(x0, -B + 30, 0, x0 + (L - Xp - 120) / 4 - 30, B - 30, 40)).color(manganeseSteel));
}

// ---- Two stepped grizzly decks ----
const decks = [[2050, Xp - 20, -170], [0, 1950, -340]];
const nBar = Math.floor((2 * B + gap) / (70 + gap));
const pitchY = (2 * B - 70) / (nBar - 1);
for (const [d, [x0, x1, zt]] of decks.entries()) {
  for (const [j, x] of [x0 + 250, x1 - 250].entries()) add(`deck-${d}-cross-beam-${j}`, D(blk(x - 110, -B, zt - 480, x + 110, B, zt - 240)).color(coatedSteel));
  for (let i = 0; i < nBar; i++) {
    const y = -B + 35 + i * pitchY;
    add(`deck-${d}-bar-${i}`, D(blk(x0, y - 35, zt - 240, x1, y + 35, zt)).color(manganeseSteel));
  }
  add(`deck-${d}-step-lip`, D(blk(x1 - 60, -B, zt - 240, x1 + 20, B, zt + 30)).color(manganeseSteel));
}

// ---- Vibrator motors on the side plates ----
const vx = 3300, vz = -120;
for (const [k, s] of [-1, 1].entries()) {
  const ya = s * (B + T), yb = s * (B + T + 520);
  add(`vibrator-mount-${k}`, D(blk(vx - 380, Math.min(ya, s * (B + T + 60)), vz - 330, vx + 380, Math.max(ya, s * (B + T + 60)), vz + 330)).color(coatedSteel));
  add(`vibrator-motor-${k}`, D(cylY(280, Math.min(s * (B + T + 60), yb), Math.max(s * (B + T + 60), yb), vx, vz, 14)).color(structuralSteel));
  add(`vibrator-weight-cover-${k}`, D(cylY(310, Math.min(yb, s * (B + T + 680)), Math.max(yb, s * (B + T + 680)), vx, vz, 14)).color(warn));
  add(`vibrator-feet-${k}`, D(blk(vx - 330, Math.min(s * (B + T + 60), yb), vz - 330, vx + 330, Math.max(s * (B + T + 60), yb), vz - 200)).color(structuralSteel));
  add(`vibrator-terminal-box-${k}`, D(blk(vx - 120, Math.min(s * (B + T + 200), s * (B + T + 400)), vz + 260, vx + 120, Math.max(s * (B + T + 200), s * (B + T + 400)), vz + 400)).color(structuralSteel));
}

// ---- Spring brackets, coil springs and pedestals ----
const Hsp = 620;
for (const [j, xb] of [450, L - 450].entries()) {
  for (const [k, s] of [-1, 1].entries()) {
    const ya = s * (B + T), yb = s * (B + T + 420), ym = s * (B + T + 230);
    add(`spring-bracket-${j}-${k}`, D(blk(xb - 220, Math.min(ya, yb), -700, xb + 220, Math.max(ya, yb), -520)).color(coatedSteel));
    const [bx, bz] = world(xb, -700);
    const z0 = bz - Hsp;
    add(`spring-core-${j}-${k}`, rod(95, z0, bz, 10).translate(bx, ym, 0).color(dark));
    for (let c = 0; c < 5; c++) {
      add(`spring-coil-${j}-${k}-${c}`, rod(165, z0 + 40 + c * 120, z0 + 95 + c * 120, 12).translate(bx, ym, 0).color(warn));
    }
    add(`spring-pedestal-${j}-${k}`, blk(bx - 260, ym - 260, 0, bx + 260, ym + 260, z0).color(structuralSteel));
    add(`pedestal-base-${j}-${k}`, blk(bx - 400, ym - 400, 0, bx + 400, ym + 400, 60).color(structuralSteel));
  }
  add(`pedestal-tie-${j}`, blk(world(xb, -700)[0] - 120, -B - T - 230, 400, world(xb, -700)[0] + 120, B + T + 230, 600).color(structuralSteel));
}

// ---- Fines chute under the bars ----
const [fxa] = world(150, -600), [fxb] = world(Xp - 100, -600);
add('fines-chute', rect(fxa + 600, fxb - 600, -B + 250, B - 250).loft([rect(fxa, fxb, -B - 20, B + 20)], {
  planes: [{ plane: 'XY', origin: [0, 0, 700] }, { plane: 'XY', origin: [0, 0, Zd - 750] }],
  ruled: true,
}).subtract(rect(fxa + 660, fxb - 660, -B + 310, B - 310).loft([rect(fxa + 60, fxb - 60, -B + 40, B - 40)], {
  planes: [{ plane: 'XY', origin: [0, 0, 690] }, { plane: 'XY', origin: [0, 0, Zd - 740] }],
  ruled: true,
})).color(structuralSteel));
for (const [k, [x, y]] of [[fxa + 700, -B + 350], [fxa + 700, B - 350], [fxb - 700, -B + 350], [fxb - 700, B - 350]].entries()) {
  add(`chute-leg-${k}`, blk(x - 60, y - 60, 0, x + 60, y + 60, 760).color(structuralSteel));
}
add('fines-in-chute', rect(fxa + 640, fxb - 640, -B + 290, B - 290).loft([rect(fxa + 400, fxb - 400, -B + 160, B - 160)], {
  planes: [{ plane: 'XY', origin: [0, 0, 700] }, { plane: 'XY', origin: [0, 0, 1000] }],
  ruled: true,
}).color(oreDark));

// ---- Ore on the feed pan and oversize on the bars ----
add('ore-on-pan', D(profileXZ([[Xp - 300, 0], [L - 40, 40], [L - 40, 900], [L - 900, 750], [Xp + 400, 330]], 2 * B - 40)).color(ore));
for (const [k, [x, y, r, d]] of [[3000, -400, 300, 0], [2500, 350, 260, 0], [1500, -150, 340, 1], [700, 500, 280, 1], [300, -550, 230, 1]].entries()) {
  add(`oversize-${k}`, D(sphere(r).scale([1.15, 1, 0.8]).translate(x, y, decks[d][2] + 0.75 * r)).color(k % 2 ? oreDark : ore));
}
for (const [k, [x, y]] of [[2400, -650], [2900, 100], [3300, 550], [1200, 300], [400, -100]].entries()) {
  add(`fines-${k}`, D(sphere(90).translate(x, y, decks[x > 2000 ? 0 : 1][2] + 70)).color(oreDark));
}

return p.model();
