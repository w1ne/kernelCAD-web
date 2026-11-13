// SPDX-License-Identifier: CC0-1.0
// High-pressure grinding rolls (HPGR), the roller press that crushes ore by
// squeezing a packed bed of it between two counter-rotating rolls instead
// of by impact. What makes it one: two big studded rolls side by side in a
// heavy rectangular machine frame, one roll fixed and one floating in
// sliding bearing blocks that hydraulic cylinders push towards it, a choke
// feed chute and bin standing over the nip, and two long drive trains
// (cardan shaft, planetary gearbox, motor) coming out of the roll shafts on
// the back side. The product cake falls onto a belt under the frame.
// Millimetres, Z up, roll axes along Y, frame face on -Y (front), drives
// towards +Y, hydraulic power unit at +X.
meta({
  name: "high-pressure-grinding-rolls",
  license: 'CC0-1.0',
  title: "High-pressure grinding rolls",
  description: "HPGR roller press at about real size: two studded rolls with cheek plates in a heavy rectangular machine frame on concrete plinths, fixed and floating bearing blocks, horizontal hydraulic pressing cylinders with nitrogen accumulators and a hydraulic power unit, choke feed chute and bin loaded with ore over the nip, twin drive trains of cardan shafts, planetary gearboxes and motors on a drive plinth, and a product belt under the rolls carrying pressed cake. Material controls: frame coating, drive, cylinder barrel and bin steel, studded roll tyres, belts and rubber, plus a roll size choice (1.7, 2.0 or 2.4 m diameter) that resizes the whole machine. weathered, highVisibility and bluePlant presets.",
  tags: ['mining', 'mineral processing', 'comminution', 'HPGR', 'high pressure grinding rolls', 'roller press', 'planetary gearbox', 'crushing plant'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3f8a68', { label: 'Frame coating' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Drive, cylinder barrel and bin steel' });
const rollSurface = param('rollSurface', '#7b8083', { label: 'Studded roll tyres' });
const rubber = param('rubber', '#25292b', { label: 'Belts and rubber' });
const rollDiameter = param('rollDiameter', '2.0 m', { choices: ['1.7 m', '2.0 m', '2.4 m'], label: 'Roll diameter' });
presets({
  weathered: { coatedSteel: '#6b7d6f', structuralSteel: '#666a66', rollSurface: '#6f6a64', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rollSurface: '#9aa0a2', rubber: '#24282a' },
  bluePlant: { coatedSteel: '#2f6fb0', structuralSteel: '#2d3134', rollSurface: '#8c9194', rubber: '#1d2022' },
});

const p = assembly("high-pressure-grinding-rolls");
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
const rect = (hx, hy) => path().moveTo(-hx, -hy).lineTo(hx, -hy).lineTo(hx, hy).lineTo(-hx, hy).close();

const ore = '#8a7d6c', oreDark = '#6f6457', cake = '#a09382', dark = '#1e2123', concrete = '#a6a196', warn = '#e8c21e', chrome = '#c3cacc';
const R = { '1.7 m': 850, '2.0 m': 1000, '2.4 m': 1200 }[rollDiameter.value];
const W = 0.8 * R; // roll half-width
const C = R + 60; // roll centre offset from the nip
const Zf = 1250; // top of the frame bottom beam
const Zr = Zf + R + 150; // roll axis height
const Zt = Zr + R + 450; // top of the frame
const Yi = W + 100, Yo = W + 500; // frame side plates, inner and outer faces
const X0 = -(2 * R + 650), X1 = 2 * R + 1200; // frame ends
const Wx0 = -(2 * R + 350), Wx1 = 2 * R + 900; // frame window ends

// ---- Concrete plinths and the two side frames ----
for (const [k, s] of [-1, 1].entries()) {
  const ya = s * (Yi - 150), yb = s * (Yo + 150);
  add(`frame-plinth-${k}`, blk(X0 - 150, Math.min(ya, yb), 0, X1 + 150, Math.max(ya, yb), 900).color(concrete));
  const y0 = Math.min(s * Yi, s * Yo), y1 = Math.max(s * Yi, s * Yo);
  add(`side-frame-${k}`, blk(X0, y0, 900, X1, y1, Zt).subtract(blk(Wx0, y0 - 10, Zf, Wx1, y1 + 10, Zt - 350)).color(coatedSteel));
  for (const [j, x] of [X0 + 120, X1 - 120].entries()) {
    add(`frame-tie-bolt-${k}-${j}`, rod(80, 800, Zt + 150, 8).translate(x, s * (Yi + Yo) / 2, 0).color(chrome));
  }
}
for (const [k, x] of [X0 + 150, X1 - 150].entries()) add(`frame-cross-tie-${k}`, blk(x - 150, -Yi, Zt - 350, x + 150, Yi, Zt).color(coatedSteel));

// ---- Rolls, bearing blocks and pressing cylinders ----
for (const [k, s] of [-1, 1].entries()) {
  const x = s * C;
  add(`roll-${k}`, cylY(R, -W, W, x, Zr, 24).color(rollSurface));
  for (const [j, y] of [-W, W - 70].entries()) add(`cheek-plate-${k}-${j}`, cylY(R + 70, y, y + 70, x, Zr, 24).color(structuralSteel));
  for (let y = -W + 140; y < W - 100; y += 180) add(`stud-band-${k}-${Math.round(y)}`, cylY(R + 8, y, y + 50, x, Zr, 24).color(dark));
  add(`roll-shaft-${k}`, cylY(0.28 * R, -Yo - 260, Yo + 700, x, Zr, 12).color(chrome));
  for (const [j, t] of [-1, 1].entries()) {
    const ya = t * (Yi - 60), yb = t * (Yo + 140);
    add(`bearing-block-${k}-${j}`, blk(x - 0.68 * R, Math.min(ya, yb), Zr - 0.72 * R, x + 0.68 * R, Math.max(ya, yb), Zr + 0.72 * R).color(structuralSteel));
    add(`bearing-cap-${k}-${j}`, cylY(0.42 * R, Math.min(t * (Yo + 140), t * (Yo + 230)), Math.max(t * (Yo + 140), t * (Yo + 230)), x, Zr, 12).color(s > 0 ? warn : structuralSteel));
  }
}
// The +X roll floats: two cylinders per side push its bearing blocks towards the nip.
// Barrels are painted steel tube; only the piston rods are hard-chrome.
const cx0 = C + 0.68 * R, cx1 = Wx1;
for (const [j, t] of [-1, 1].entries()) {
  const y = t * (Yi + Yo) / 2;
  for (const [i, dz] of [-0.38 * R, 0.38 * R].entries()) {
    add(`press-cylinder-${j}-${i}`, tube([cx1, y, Zr + dz], [cx0 + 0.45 * (cx1 - cx0), y, Zr + dz], 0.2 * R, 10).color(structuralSteel));
    add(`press-cylinder-rod-${j}-${i}`, tube([cx0 + 0.45 * (cx1 - cx0), y, Zr + dz], [cx0, y, Zr + dz], 0.1 * R, 8).color(chrome));
  }
}

// ---- Hydraulic power unit and accumulators (+X) ----
const hx = X1 + 500;
add('hydraulic-unit', blk(hx, -1300, 0, hx + 1300, 100, 1050).color(structuralSteel));
add('hydraulic-tank-lid', blk(hx + 80, -1220, 1050, hx + 1220, 20, 1120).color(coatedSteel));
add('hydraulic-motor', cylY(180, -1100, -700, hx + 400, 1300, 10).color(coatedSteel));
for (const [k, x] of [hx + 200, hx + 550, hx + 900].entries()) {
  add(`accumulator-${k}`, lathe([[160, 0], [170, 80], [170, 1500], [90, 1700]], 10).translate(x, -Yo - 500, 0).color(warn));
}
for (const [k, t] of [-1, 1].entries()) {
  add(`pressure-hose-${k}`, tube([hx + 300, -600 + t * 200, 1100], [X1 - 100, t * (Yi + Yo) / 2, Zr - 0.38 * R], 45, 6).color(rubber));
}

// ---- Choke feed chute and feed bin over the nip ----
add('feed-chute', rect(0.38 * R, W - 30).loft([rect(R, W + 300)], { planes: [{ plane: 'XY', origin: [0, 0, Zr + 0.82 * R] }, { plane: 'XY', origin: [0, 0, Zt] }], ruled: true }).color(structuralSteel));
const Zb = Zt + 1.3 * R;
add('feed-bin', blk(-R, -W - 300, Zt, R, W + 300, Zb).subtract(blk(-R + 60, -W - 240, Zt + 60, R - 60, W + 240, Zb + 10)).color(structuralSteel));
for (const [k, z] of [Zt + 0.45 * R, Zt + 0.9 * R].entries()) {
  add(`bin-band-${k}`, blk(-R - 50, -W - 350, z, R + 50, W + 350, z + 120).subtract(blk(-R + 10, -W - 290, z - 10, R - 10, W + 290, z + 130)).color(coatedSteel));
}
add('ore-in-bin', sphere(R).scale([0.95, (W + 240) / R, 0.45]).translate(0, 0, Zb - 0.15 * R).subtract(blk(-R, -W - 300, Zt, R, W + 300, Zb - 0.3 * R)).color(ore));
for (const [k, [x, y]] of [[-0.45 * R, -0.5 * W], [0.3 * R, -0.75 * W], [0.1 * R, 0.4 * W], [-0.3 * R, 0.8 * W]].entries()) {
  add(`ore-lump-${k}`, sphere(0.15 * R).translate(x, y, Zb + 0.1 * R).color(oreDark));
}
add('level-radar', rod(90, Zb, Zb + 300, 8).translate(0.7 * R, 0.7 * W, 0).color(warn));
add('level-radar-arm', blk(0.6 * R, 0.6 * W, Zb - 40, 0.82 * R, W + 320, Zb + 20).color(structuralSteel));

// ---- Twin drive trains: cardan shaft, planetary gearbox, motor (+Y) ----
const Yg = Yo + 2300, Ym = Yg + 1100, Ye = Ym + 1700;
for (const [k, s] of [-1, 1].entries()) {
  const x = s * C;
  add(`drive-plinth-${k}`, blk(x - 0.6 * R, Yg - 200, 0, x + 0.6 * R, Ye + 200, Zr - 0.72 * R).color(concrete));
  add(`cardan-shaft-${k}`, cylY(0.13 * R, Yo + 700, Yg, x, Zr, 10).color(chrome));
  for (const [j, y] of [Yo + 700, Yg - 160].entries()) add(`cardan-yoke-${k}-${j}`, cylY(0.3 * R, y, y + 160, x, Zr, 12).color(structuralSteel));
  add(`gearbox-${k}`, cylY(0.7 * R, Yg, Ym, x, Zr, 16).color(coatedSteel));
  add(`gearbox-flange-${k}`, cylY(0.78 * R, Yg + 380, Yg + 500, x, Zr, 16).color(coatedSteel));
  add(`gearbox-torque-arm-${k}`, blk(x - 0.15 * R, Yg + 200, Zr - 0.72 * R, x + 0.15 * R, Yg + 700, Zr).color(structuralSteel));
  add(`motor-${k}`, cylY(0.5 * R, Ym + 100, Ye, x, Zr, 16).color(structuralSteel));
  for (let y = Ym + 300; y < Ye - 200; y += 300) add(`motor-fin-${k}-${Math.round(y)}`, cylY(0.55 * R, y, y + 80, x, Zr, 16).color(structuralSteel));
  add(`motor-fan-cowl-${k}`, cylY(0.45 * R, Ye, Ye + 300, x, Zr, 16).color(dark));
  add(`motor-feet-${k}`, blk(x - 0.4 * R, Ym + 200, Zr - 0.72 * R, x + 0.4 * R, Ye - 100, Zr - 0.3 * R).color(structuralSteel));
  add(`motor-terminal-box-${k}`, blk(x - 0.2 * R, Ym + 500, Zr + 0.5 * R, x + 0.2 * R, Ym + 900, Zr + 0.75 * R).color(structuralSteel));
}

// ---- Product belt under the rolls ----
const bx0 = X0 - 1500, bx1 = X1 + 3000;
for (const [k, y] of [-W + 150, W - 150].entries()) add(`belt-stringer-${k}`, blk(bx0, y - 60, 380, bx1, y + 60, 600).color(structuralSteel));
add('product-belt', blk(bx0, -W + 200, 560, bx1, W - 200, 620).color(rubber));
add('product-cake', extrudePolygon([[-0.5 * W, 620], [0.5 * W, 620], [0.25 * W, 760], [-0.25 * W, 770]], bx1 - 400).rotateY(90).rotateX(90).color(cake));
for (const [k, x] of [bx0, bx1].entries()) add(`belt-pulley-${k}`, cylY(230, -W + 200, W - 200, x, 430 + 160, 12).color(structuralSteel));
for (const [k, x] of [bx0 + 300, X1 + 1700].entries()) {
  for (const [j, y] of [-W + 150, W - 150].entries()) add(`belt-leg-${k}-${j}`, blk(x - 60, y - 60, 0, x + 60, y + 60, 380).color(structuralSteel));
}

return p.model();
