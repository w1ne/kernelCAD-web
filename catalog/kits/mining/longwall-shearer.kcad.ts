// SPDX-License-Identifier: CC0-1.0
// Longwall shearer, the machine that cuts a long coal face in strips while
// riding along the armoured face conveyor (AFC) that carries the coal away.
// What makes it one: a long low body straddling the AFC with a ranging arm
// at each end, each arm carrying a big spiral-vaned cutter drum studded
// with picks. The leading drum is raised to cut the roof coal, the trailing
// drum is lowered to cut the floor coal, so one pass takes a full-height
// web out of the face. Haulage units at each end walk the shearer along a
// rack bar on the goaf side of the conveyor, beside the cable trough, and
// the hydraulic roof shields behind it hold the roof up as it passes.
// Millimetres, Z up, face runs along X, coal face towards +Y, goaf (the
// mined-out side with the shields) towards -Y. The shearer travels to +X.
meta({
  name: "longwall-shearer",
  license: 'CC0-1.0',
  title: "Longwall shearer",
  description: "Double-ended ranging-drum longwall shearer at about real size on a section of armoured face conveyor: long body with haulage units, control box and lights on an underframe that rides the conveyor, two ranging arms with lift cylinders and spiral-vaned cutter drums carrying picks, leading drum on the roof and trailing drum on the floor, coal face showing the uncut web ahead and the lower bench between the drums, conveyor pans with flight bars, toe ramp, spill plate, rack bar and cable trough, cut coal on the conveyor, and two two-leg hydraulic roof shields ahead of the leading drum. Material controls: shearer paint, conveyor and shield steel, drum and pick steel, hoses and cable, plus a seam height choice (2.5, 3.2, 4.0 m) that sets the drum size, arm angles and shield height. weathered, eickhoffGreen and highVisibility presets.",
  tags: ['mining', 'underground', 'coal', 'longwall', 'shearer', 'armoured face conveyor', 'roof support', 'mining machine'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'underground', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shearerPaint = param('shearerPaint', '#d99a1f', { label: 'Shearer paint' });
const steelwork = param('steelwork', '#566168', { label: 'Conveyor and shield steel' });
const drumSteel = param('drumSteel', '#8f9491', { label: 'Drum and pick steel' });
const hoses = param('hoses', '#25292b', { label: 'Hoses and cable' });
const seamHeight = param('seamHeight', '3.2 m', { choices: ['2.5 m', '3.2 m', '4.0 m'], label: 'Seam height' });
presets({
  weathered: { shearerPaint: '#8f7a52', steelwork: '#5f625f', drumSteel: '#77706a', hoses: '#393a38' },
  eickhoffGreen: { shearerPaint: '#3f7f4a', steelwork: '#3c4246', drumSteel: '#9da19e', hoses: '#1f2224' },
  highVisibility: { shearerPaint: '#f0b01c', steelwork: '#465159', drumSteel: '#b0b5b2', hoses: '#24282a' },
});

const p = assembly("longwall-shearer");
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
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar along Y from y0 to y1, centred on (x, z).
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// (x, z) outline extruded along Y, centred on y = 0.
const profileXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// (y, z) outline extruded along X, centred on x = 0.
const profileYZ = (pts, t) => profileXZ(pts, t).rotateZ(90);

const coal = '#222327', coalLit = '#3d3f45', chrome = '#c9ced0', lamp = '#fff1b0', warn = '#e8c21e';
const H = { '2.5 m': 2500, '3.2 m': 3200, '4.0 m': 4000 }[seamHeight.value];
const D = { '2.5 m': 1400, '3.2 m': 1800, '4.0 m': 2200 }[seamHeight.value];
const R = D / 2;
const X0 = -9000, X1 = 11000; // face section shown

// ---- Armoured face conveyor ----
add('afc-pans', blk(X0, -400, 0, X1, 500, 300).color(steelwork));
add('afc-deck', blk(X0, -330, 300, X1, 430, 330).color(drumSteel));
add('afc-toe-ramp', profileYZ([[500, 0], [800, 0], [500, 300]], X1 - X0).translate((X0 + X1) / 2, 0, 0).color(steelwork));
add('spill-plate', blk(X0, -650, 0, X1, -400, 1000).color(steelwork));
add('rack-bar', blk(X0, -620, 1000, X1, -430, 1100).color(drumSteel));
add('cable-trough', blk(X0, -950, 0, X1, -650, 700).color(steelwork));
add('cable-in-trough', tube([X0, -800, 760], [X1 - 300, -800, 760], 70, 6).color(hoses));
for (let x = X0 + 600, i = 0; x < X1; x += 1200, i++) add(`flight-bar-${i}`, blk(x - 40, -330, 330, x + 40, 430, 380).color(steelwork));

// ---- Shearer body on its underframe ----
const BX = 3400;
add('underframe', blk(-BX + 300, -650, 1000, BX - 300, 450, 1150).color(steelwork));
for (const [k, x] of [-2400, 2400].entries()) {
  add(`goaf-shoe-${k}`, blk(x - 400, -660, 1100, x + 400, -400, 1250).color(steelwork));
  add(`face-leg-${k}`, blk(x - 300, 380, 300, x + 300, 520, 1150).color(steelwork));
}
add('body', profileXZ([[-BX, 1150], [BX, 1150], [BX, 1650], [BX - 300, 1850], [-BX + 300, 1850], [-BX, 1650]], 1100).translate(0, -100, 0).color(shearerPaint));
for (const [k, s] of [-1, 1].entries()) {
  add(`haulage-unit-${k}`, blk(s * BX - (s > 0 ? 1300 : 0) - (s < 0 ? 0 : 0), -720, 1050, s * BX + (s < 0 ? 1300 : 0), -560, 1700).color(shearerPaint));
  add(`haulage-sprocket-${k}`, cylY(260, -760, -690, s * (BX - 650), 1150, 10).color(drumSteel));
  add(`body-lamp-${k}`, blk(s * (BX - 900) - 120, -680, 1700, s * (BX - 900) + 120, -650, 1790).color(lamp));
}
add('control-box', blk(-800, -720, 1250, 800, -650, 1750).color(steelwork));
add('control-display', blk(-500, -735, 1450, 0, -720, 1680).color('#3c7fa8'));
for (const [k, x] of [400, 600].entries()) add(`control-button-${k}`, blk(x - 50, -740, 1500, x + 50, -720, 1600).color(k ? warn : '#c8322b'));
add('water-manifold', tube([-2600, -680, 1880], [2600, -680, 1880], 50, 6).color(hoses));
add('cable-handler', blk(-3000, -940, 760, 3000, -660, 1050).color(steelwork));

// ---- Ranging arms and cutter drums ----
// Leading (+X) drum cuts the roof, trailing (-X) drum cuts the floor.
const L = 2600, PZ = 1250;
const drumY0 = 850, drumY1 = 1750;
const drums = [
  { s: 1, zc: H - R - 40 },
  { s: -1, zc: R + 140 },
];
const drumX = [];
for (const [k, { s, zc }] of drums.entries()) {
  const a = Math.asin((zc - PZ) / L);
  const xc = s * (BX + L * Math.cos(a));
  drumX.push(xc);
  const armAng = (Math.atan2(zc - PZ, xc - s * BX) * 180) / Math.PI;
  add(`ranging-arm-${k}`, blk(-250, 500, -300, L, 850, 300).rotateY(-armAng).translate(s * BX, 0, PZ).color(shearerPaint));
  add(`arm-pivot-${k}`, cylY(320, 450, 900, s * BX, PZ, 12).color(steelwork));
  add(`arm-gearhead-${k}`, cylY(460, 500, 850, xc, zc, 12).color(shearerPaint));
  const cylTop = [s * BX + (xc - s * BX) * 0.45, zc * 0.45 + PZ * 0.55 - 260];
  add(`arm-lift-cylinder-${k}`, tube([s * (BX - 600), 650, 1000], [cylTop[0], 650, Math.max(cylTop[1], 600)], 110, 8).color(chrome));
  add(`drum-core-${k}`, cylY(R * 0.62, drumY0, drumY1, xc, zc, 14).color(drumSteel));
  add(`drum-face-ring-${k}`, cylY(R, drumY1 - 160, drumY1, xc, zc, 18).color(drumSteel));
  add(`drum-back-plate-${k}`, cylY(R * 0.9, drumY0, drumY0 + 60, xc, zc, 16).color(drumSteel));
  // Three spiral vanes, each stepped in short radial plates.
  for (let v = 0; v < 3; v++) {
    for (let i = 0; i < 4; i++) {
      const y0 = drumY0 + 60 + i * 170, th = v * 120 + i * 32 * s;
      add(`vane-${k}-${v}-${i}`, blk(-80, y0, R * 0.6, 80, y0 + 170, R - 30).rotateY(th).translate(xc, 0, zc).color(drumSteel));
      add(`vane-pick-${k}-${v}-${i}`, lathe([[40, R - 40], [28, R + 60], [8, R + 120]], 6).rotateY(th).translate(xc, y0 + 85, zc).color(steelwork));
    }
  }
  for (let j = 0; j < 8; j++) {
    add(`face-pick-${k}-${j}`, lathe([[40, R - 20], [28, R + 70], [8, R + 130]], 6).rotateY(j * 45 + 20).translate(xc, drumY1 - 80, zc).color(steelwork));
  }
  add(`spray-hose-${k}`, tube([s * (BX - 200), 520, 1800], [s * (BX + 900), 520, PZ + 300], 30, 6).color(hoses));
}

// ---- Coal face: cut back wall, uncut web ahead, floor bench between drums ----
add('coal-face', blk(X0, 1750, 0, X1, 2150, H).color(coal));
add('uncut-web', blk(drumX[0] + R + 60, 900, 0, X1, 1750, H).color(coalLit));
add('floor-bench', blk(drumX[1] + R + 60, 900, 0, drumX[0] - R - 60, 1750, H - D - 40).color(coalLit));
add('roof-strip', blk(X0, 900, H, X1, 2150, H + 150).color('#5d5850'));
add('afc-coal', profileYZ([[-300, 330], [400, 330], [250, 560], [-150, 600]], drumX[1] - X0 + 1500).translate((X0 + drumX[1] + 1500) / 2, 0, 0).color(coal));
for (const [k, [x, y, r]] of [[drumX[1] + 900, 300, 200], [drumX[1] + 1500, -100, 160], [drumX[0] - 400, 700, 150]].entries()) {
  add(`coal-lump-${k}`, sphere(r).scale([1.2, 1, 0.75]).translate(x, y, 330 + r * 0.6).color(coal));
}

// ---- Two-leg hydraulic roof shields ahead of the leading drum ----
for (const [k, xs] of [8300, 10100].entries()) {
  for (const [j, dx] of [-480, 480].entries()) add(`shield-base-${k}-${j}`, blk(xs + dx - 260, -3700, 0, xs + dx + 260, -1200, 450).color(steelwork));
  add(`shield-canopy-${k}`, profileYZ([[-3400, H - 300], [400, H - 220], [400, H], [-3400, H]], 1600).translate(xs, 0, 0).color(steelwork));
  add(`caving-shield-${k}`, profileYZ([[-3700, 900], [-3400, H - 300], [-3150, H - 300], [-3450, 900]], 1550).translate(xs, 0, 0).color(steelwork));
  for (const [j, dx] of [-480, 480].entries()) {
    add(`shield-leg-${k}-${j}`, tube([xs + dx, -2100, 450], [xs + dx, -1400, (H - 300) * 0.55], 170, 10).color(shearerPaint));
    add(`shield-leg-ram-${k}-${j}`, tube([xs + dx, -1400, (H - 300) * 0.5], [xs + dx, -1050, H - 300], 110, 10).color(chrome));
    add(`lemniscate-link-${k}-${j}`, tube([xs + dx, -3300, 400], [xs + dx, -3550, 1100], 90, 6).color(steelwork));
  }
  add(`relay-bar-${k}`, blk(xs - 120, -1200, 120, xs + 120, -950, 330).color(drumSteel));
  add(`shield-valve-bank-${k}`, blk(xs - 350, -2700, 450, xs + 350, -2400, 900).color(warn));
  add(`shield-hose-${k}`, tube([xs - 300, -2550, 900], [xs - 300, -1200, H - 350], 30, 6).color(hoses));
}

return p.model();
