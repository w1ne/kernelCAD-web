// SPDX-License-Identifier: CC0-1.0
// Ore-pass grizzly, the steel screen over the top of an underground ore pass
// where loaders tip ore. What makes one: a heavy concrete collar around a
// square opening into the pass, two cross bearers on the collar and a row of
// heavy rail-section bars spanning the opening with a fixed aperture, so
// fines drop down the pass and oversize rocks stay on top. A striped steel
// bump rail on the tipping side stops the loader bucket short of the bars;
// a pedestal rock breaker on the far corner reaches over the bars to break
// the oversize. Around it: guard posts with a chain along both sides and an
// amber beacon on a post.
// The rock choice shows oversize rocks on the bars or a clear grizzly.
// Millimetres, Z up, loaders tip from the -Y side, ground level at the
// drive floor.
meta({
  name: "ore-pass-grizzly",
  license: 'CC0-1.0',
  title: "Ore-pass grizzly",
  description: "Underground ore-pass tipping point at about real size: 5.4 m concrete collar around a 3 m square pass opening, two cross bearers carrying seven rail-section grizzly bars at a 400 mm aperture, striped steel bump rail on the tipping side, pedestal rock breaker with slew ring, boom, stick and hydraulic hammer folded over the bars, guard posts with chain along both sides and an amber beacon post. Rock choice (oversize, clear) puts broken oversize on the bars. Material controls: collar concrete, grizzly steel, hazard paint and rock. weathered, freshShotcrete and darkOre presets.",
  tags: ['mining', 'underground', 'ore pass', 'grizzly', 'rock breaker', 'tipping point', 'ore handling'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const rocks = param('rocks', 'oversize', { choices: ['oversize', 'clear'], label: 'Rock on the bars' });
const concrete = param('concrete', '#9a978f', { label: 'Collar concrete' });
const grizzlySteel = param('grizzlySteel', '#5b6268', { label: 'Grizzly bar steel' });
const hazardPaint = param('hazardPaint', '#e8b21e', { label: 'Hazard and breaker paint' });
const rock = param('rock', '#7a6e62', { label: 'Broken rock' });
presets({
  weathered: { concrete: '#7f7a70', grizzlySteel: '#5e5248', hazardPaint: '#b48c3a', rock: '#6b6157' },
  freshShotcrete: { concrete: '#bdb9ae', grizzlySteel: '#6c747a', hazardPaint: '#f0c020', rock: '#8a8174' },
  darkOre: { concrete: '#8a877f', grizzlySteel: '#4a5056', hazardPaint: '#e07a1e', rock: '#3a3836' },
});

const p = assembly("ore-pass-grizzly");
const add = (name, shape) => p.part(name, shape.scale(scale));

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
const blk = (x0, y0, z0, x1, y1, z1) => box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Closed (y, z) outline extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};

const black = '#1d1f21', voidDark = '#121314', amber = '#f08a1c', hose = '#2a2c2e', hammerSteel = '#3e4448';
const C = 2700; // half collar size
const O = 1500; // half opening size
const ZC = 500; // collar top
// Rail section (u across, v up), 170 mm tall.
const railSection = [[-75, 0], [75, 0], [75, 16], [11, 18], [11, 118], [36, 126], [36, 170], [-36, 170], [-36, 126], [-11, 118], [-11, 18], [-75, 16]];

// ---- Collar and pass opening ----
const collar = blk(-C, -C, 0, C, C, ZC).subtract(blk(-O, -O, -10, O, O, ZC + 10));
add('collar', collar.color(concrete));
add('pass-void', blk(-O, -O, 0, O, O, 12).color(voidDark));
for (const [k, s] of [-1, 1].entries()) add(`collar-edge-angle-${k}`, blk(-O - 80, s * O - 80, ZC - 10, O + 80, s * O + 80, ZC + 10).color(grizzlySteel));

// ---- Bearers and bars ----
const ZB = ZC + 150; // bearer top
for (const [k, s] of [-1, 1].entries()) add(`bearer-${k}`, prismX(railSection.map(([u, v]) => [u * 2.2, ZC + (v * 150) / 170]), -O - 500, O + 500).translate(0, s * (O + 150), 0).color(grizzlySteel));
const PITCH = 470;
for (let i = 0; i < 7; i++) {
  const x = (i - 3) * PITCH;
  add(`grizzly-bar-${i}`, prismX(railSection.map(([u, v]) => [u, ZB + v]), -O - 400, O + 400).rotateZ(90).translate(x, 0, 0).color(grizzlySteel));
}
for (const [k, s] of [-1, 1].entries()) add(`bar-retainer-${k}`, blk(-3 * PITCH - 120, s * (O + 330) - 40, ZB, 3 * PITCH + 120, s * (O + 330) + 40, ZB + 170).color(grizzlySteel));

// ---- Bump rail on the tipping side ----
const BY = -C + 300;
add('bump-rail-base', blk(-O - 600, BY - 200, ZC, O + 600, BY + 200, ZC + 80).color(grizzlySteel));
for (let i = 0, x = -O - 600; x < O + 600; x += 300, i++) add(`bump-rail-stripe-${i}`, blk(x, BY - 160, ZC + 80, x + 300, BY + 160, ZC + 480).color(i % 2 === 0 ? hazardPaint : black));
for (const [k, x] of [-O - 450, 0, O + 450].entries()) add(`bump-rail-gusset-${k}`, prismX([[BY + 160, ZC + 80], [BY + 420, ZC + 80], [BY + 160, ZC + 420]], x - 25, x + 25).color(grizzlySteel));

// ---- Pedestal rock breaker on the far corner ----
const PX = 2050, PY = 2050;
add('breaker-pedestal', lathe([[520, ZC], [420, ZC + 120], [380, ZC + 900]], 12).translate(PX, PY, 0).color(hazardPaint));
add('breaker-slew-ring', lathe([[440, ZC + 900], [440, ZC + 1020]], 14).translate(PX, PY, 0).color(black));
add('breaker-king-post', blk(PX - 260, PY - 220, ZC + 1020, PX + 260, PY + 220, ZC + 1500).color(hazardPaint));
const B0 = [PX - 100, PY - 100, ZC + 1350], B1 = [900, 900, ZC + 3000], H0 = [-200, -150, ZB + 1100];
add('breaker-boom', tube(B0, B1, 170, 8).color(hazardPaint));
add('breaker-stick', tube(B1, H0, 130, 8).color(hazardPaint));
add('breaker-boom-ram', tube([PX - 50, PY - 300, ZC + 1100], [1400, 1250, ZC + 2400], 70, 8).color(grizzlySteel));
add('breaker-stick-ram', tube([1100, 1100, ZC + 3150], [100, 120, ZB + 1600], 60, 8).color(grizzlySteel));
add('breaker-hose', tube([PX - 200, PY - 260, ZC + 1500], [700, 650, ZC + 3000], 30, 6).color(hose));
add('hammer-housing', blk(-420, -360, ZB + 600, 20, 60, ZB + 1150).color(hammerSteel));
add('hammer-tool', lathe([[70, ZB + 260], [70, ZB + 600]], 8).translate(-200, -150, 0).color(grizzlySteel));
add('hammer-tool-tip', lathe([[10, ZB + 190], [70, ZB + 260]], 8).translate(-200, -150, 0).color(grizzlySteel));

// ---- Guard posts and chain along both sides, beacon post ----
for (const [k, s] of [-1, 1].entries()) {
  const x = s * (C - 200);
  const posts = [-1500, 0, 1500];
  for (const [i, y] of posts.entries()) {
    add(`guard-post-${k}-${i}`, blk(x - 50, y - 50, ZC, x + 50, y + 50, ZC + 1100).color(hazardPaint));
    add(`guard-post-cap-${k}-${i}`, blk(x - 60, y - 60, ZC + 1050, x + 60, y + 60, ZC + 1130).color(black));
  }
  for (let i = 0; i < posts.length - 1; i++) {
    add(`guard-chain-${k}-${i}-a`, tube([x, posts[i], ZC + 1000], [x, (posts[i] + posts[i + 1]) / 2, ZC + 820], 18, 6).color(hazardPaint));
    add(`guard-chain-${k}-${i}-b`, tube([x, (posts[i] + posts[i + 1]) / 2, ZC + 820], [x, posts[i + 1], ZC + 1000], 18, 6).color(hazardPaint));
  }
}
add('beacon-post', blk(-C + 150, C - 350, ZC, -C + 250, C - 250, ZC + 2000).color(grizzlySteel));
add('beacon', lathe([[110, ZC + 2000], [110, ZC + 2150], [60, ZC + 2240]], 10).translate(-C + 200, C - 300, 0).color(amber));

// ---- Oversize rock on the bars ----
if (rocks.value === 'oversize') {
  const pile = [[-700, -400, 420, [1.2, 0.9, 0.75]], [300, 200, 520, [1, 1.2, 0.8]], [900, -650, 360, [1.3, 1, 0.7]], [-250, 800, 330, [1, 0.8, 0.9]], [-1050, 500, 300, [0.9, 1.1, 0.8]], [600, 950, 280, [1.2, 0.9, 0.7]]];
  for (const [i, [x, y, r, s]] of pile.entries()) {
    add(`oversize-rock-${i}`, sphere(r).scale(s).rotateZ(i * 37).translate(x, y, ZB + 170 + r * s[2] * 0.85).color(rock));
  }
  add('spill-fines', blk(-C + 300, -C + 650, ZC, -C + 1400, -C + 1300, ZC + 60).color(rock));
}

return p.model();
