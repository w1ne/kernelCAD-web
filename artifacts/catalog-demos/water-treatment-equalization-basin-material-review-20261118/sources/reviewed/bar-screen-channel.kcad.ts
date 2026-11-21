// SPDX-License-Identifier: CC0-1.0
// Mechanically raked bar screen in an inlet channel, the first thing raw
// sewage meets at a works. What makes it one: a deep concrete channel with the
// flow running through it; a rack of flat bars leaning at 75 degrees across
// the channel, its side frames running up past the deck to a hooded head with
// the drive motor and gearbox; a rake carriage climbing the upstream face with
// a load of rags on its tines; screenings dropping down a discharge chute
// into a wheeled bin on the deck; grating and handrail round the opening.
// Millimetres, Z up, flow towards +X, channel centred on y = 0.
meta({
  name: "bar-screen-channel",
  license: 'CC0-1.0',
  title: "Bar screen channel",
  description: "Mechanically raked bar screen at about real size in a 1.5 m concrete inlet channel with flowing water: a rack of flat stainless bars at 75 degrees, side frames rising to a hooded head with geared drive motor, a rake carriage on the upstream face carrying rags, a discharge chute dropping screenings into a wheeled bin on the deck, downstream grating, handrails and floating debris. Material controls: concrete, stainless bars and grating, frame and drive coating, water; weathered, highVisibility and blueDrive presets.",
  tags: ['water treatment', 'wastewater', 'headworks', 'bar screen', 'screenings', 'rake', 'inlet channel'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless bars and grating' });
const coatedSteel = param('coatedSteel', '#5a7f3c', { label: 'Frame and drive coating' });
const water = param('water', '#5f6f5c', { label: 'Raw water' });
presets({
  weathered: { concrete: '#9b9587', stainlessSteel: '#9ca7a6', coatedSteel: '#66705f', water: '#5a5a48' },
  highVisibility: { concrete: '#c6bdac', stainlessSteel: '#e1ddd0', coatedSteel: '#e5682d', water: '#4f7378' },
  blueDrive: { concrete: '#b3ad9f', stainlessSteel: '#c3cbcc', coatedSteel: '#2f5f8a', water: '#53685f' },
});

const p = assembly("bar-screen-channel");
// Lifted so the lowest point (below-grade slab or water line) sits on z = 0.
const add = (name, shape) => p.part(name, shape.translate(0, 0, 300).scale(scale));

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
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Closed (x, z) side profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};

const HW = 750, WT = 300, D = 2500; // channel half width, wall, deck level
const rag = '#4a3f33', binGreen = '#3c6e3f', dark = '#202426';
// Screen line: from the channel floor at x = -500, leaning downstream at 75 degrees.
const ang = (75 * Math.PI) / 180, L = 5200;
const at = (u, off = 0) => [-500 + u * Math.cos(ang) + off * Math.sin(ang), u * Math.sin(ang) - off * Math.cos(ang)];
const top = at(L);
const at3 = (u, off, y) => { const [x, z] = at(u, off); return [x, y, z]; };

// ---- Concrete channel, deck and water ----
add('channel-floor', blk(-3500, -HW - WT, -300, 3500, HW + WT, 0).color(concrete));
for (const s of [-1, 1]) {
  add(`channel-wall-${s}`, blk(-3500, s > 0 ? HW : -HW - WT, 0, 3500, s > 0 ? HW + WT : -HW, D).color(concrete));
  add(`deck-${s}`, blk(-3500, s > 0 ? HW + WT : -HW - WT - 2400, D - 300, 3500, s > 0 ? HW + WT + 2400 : -HW - WT, D).color(concrete));
}
add('water-upstream', blk(-3500, -HW, 0, at(1650)[0] - 40, HW, 1600).color(water));
add('water-downstream', blk(at(1500)[0] + 60, -HW, 0, 3500, HW, 1450).color(water));
for (const [k, [x, y]] of [[-2900, -300], [-2300, 350], [-1700, -100], [-1200, 420]].entries()) {
  add(`floating-debris-${k}`, lathe([[160, 1580], [120, 1660]], 5).rotateZ(k * 50).translate(x, y, 0).color(rag));
}

// ---- Bar rack ----
const bars = 19;
for (let i = 0; i < bars; i++) {
  const y = -HW + 40 + (i * (2 * HW - 80)) / (bars - 1);
  add(`screen-bar-${i}`, sideY([at(0, 0), at(L * 0.62, 0), at(L * 0.62, 70), at(0, 70)], y - 10, y + 10).color(stainlessSteel));
}
add('rack-bottom-bar', sideY([at(0, -40), at(140, -40), at(140, 110), at(0, 110)], -HW, HW).color(stainlessSteel));
add('dead-plate', sideY([at(L * 0.62, 0), at(L * 0.92, 0), at(L * 0.92, 25), at(L * 0.62, 25)], -HW, HW).color(stainlessSteel));

// ---- Side frames and hooded head ----
for (const s of [-1, 1]) {
  const y0 = s > 0 ? HW - 10 : -HW - 130, y1 = y0 + 140;
  add(`side-frame-${s}`, sideY([at(0, -150), at(L, -150), at(L, 180), at(0, 180)], y0, y1).color(coatedSteel));
  add(`frame-foot-${s}`, blk(top[0] - 600, s > 0 ? HW + 30 : -HW - 330, D, top[0] - 100, s > 0 ? HW + 330 : -HW - 30, D + 40).color(coatedSteel));
  add(`deck-leg-${s}`, tube([top[0] - 350, s * (HW + 180), D + 40], [at(L * 0.62, -150)[0], s * (HW + 60), at(L * 0.62, -150)[1]], 60, 4).color(coatedSteel));
}
add('head-hood', sideY([at(L * 0.88, -260), at(L + 250, -260), at(L + 380, 300), at(L * 0.9, 500)], -HW - 140, HW + 140).color(coatedSteel));
add('head-shaft', latheY([[55, -HW - 450], [55, HW + 160]], top[0] + 60, top[1] + 120, 8).color(dark));
add('gearbox', blk(top[0] - 200, -HW - 520, top[1] - 150, top[0] + 280, -HW - 160, top[1] + 380).color(coatedSteel));
add('drive-motor', lathe([[220, 0], [240, 80], [240, 620], [200, 700]], 12).rotateX(90).translate(top[0] + 40, -HW - 520, top[1] + 110).color(coatedSteel));
add('motor-cowl', lathe([[190, 0], [150, 120]], 12).rotateX(90).translate(top[0] + 40, -HW - 1220, top[1] + 110).color(dark));

// ---- Rake carriage climbing the upstream face, with rags ----
{
  const u = L * 0.55;
  add('rake-beam', sideY([at(u, -260), at(u + 220, -260), at(u + 220, -90), at(u, -90)], -HW + 10, HW - 10).color(coatedSteel));
  for (let i = 0; i < 10; i++) {
    const y = -HW + 90 + i * ((2 * HW - 180) / 9);
    add(`rake-tine-${i}`, sideY([at(u, -90), at(u + 40, -90), at(u + 10, 40), at(u - 30, 40)], y - 15, y + 15).color(stainlessSteel));
  }
  add('rake-rags', sideY([at(u - 150, -120), at(u + 260, -280), at(u + 330, -420), at(u + 60, -470), at(u - 220, -260)], -HW + 60, HW - 120).color(rag));
  for (const s of [-1, 1]) add(`rake-guide-${s}`, tube(at3(u + 110, -175, s * (HW - 20)), at3(L - 100, -175, s * (HW - 20)), 30, 6).color(dark));
}

// ---- Discharge chute and screenings bin ----
const bx = top[0] + 1400, by = -400;
add('discharge-chute', sideY([[top[0] + 150, top[1] - 250], [top[0] + 300, top[1] - 250], [bx - 250, D + 1500], [bx - 450, D + 1500]], -500, 500).color(stainlessSteel));
for (const s of [-1, 1]) add(`chute-cheek-${s}`, sideY([[top[0] + 150, top[1] - 250], [top[0] + 300, top[1] - 50], [bx - 250, D + 1700], [bx - 450, D + 1500]], s * 500 - 15, s * 500 + 15).color(stainlessSteel));
add('bin-body', lathe([[560, D + 120], [700, D + 1300]], 4).rotateZ(45).translate(bx, by, 0).color(binGreen));
add('bin-rim', lathe([[740, D + 1300], [740, D + 1360]], 4).rotateZ(45).translate(bx, by, 0).color(dark));
add('bin-screenings', lathe([[650, D + 1280], [420, D + 1500], [150, D + 1600]], 7).translate(bx, by, 0).color(rag));
add('bin-lid', blk(bx - 520, by + 380, D + 1360, bx + 520, by + 520, D + 2200).color(binGreen));
for (const [k, [x, y]] of [[-380, -380], [-380, 380], [380, -380], [380, 380]].entries()) {
  add(`bin-castor-${k}`, latheY([[110, -40], [110, 40]], bx + x, D + 110, 8).translate(0, by + y, 0).color(dark));
}

// ---- Downstream grating and handrails ----
add('grating', blk(at(L * 0.62)[0] + 300, -HW, D - 60, 3500, HW, D).color(stainlessSteel));
for (const s of [-1, 1]) {
  const y = s * (HW + 60);
  for (const [k, x] of [-3400, -2400, -1400, -500].entries()) add(`rail-post-${s}-${k}`, rod(28, D, D + 1100, 6).translate(x, y, 0).color(coatedSteel));
  for (const z of [D + 550, D + 1100]) add(`rail-${s}-${z}`, tube([-3400, y, z], [-500, y, z], 24, 6).color(coatedSteel));
  add(`toe-board-${s}`, blk(-3400, y - 8, D, -500, y + 8, D + 150).color(coatedSteel));
}

return p.model();
