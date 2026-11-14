// SPDX-License-Identifier: CC0-1.0
// Heavy-duty apron feeder, the slow steel-plate conveyor that draws ore out
// from under a ROM hopper or stockpile and meters it into the primary
// crusher. What makes it one: an endless belt of overlapping cast manganese
// pans bolted to two strands of crawler-type chain, running on carrier rollers
// between deep side girders, with a big head sprocket shaft driven by a
// shaft-mounted gearbox and motor, a tail idler with take-up at the far end,
// and tall skirt plates under the feed hopper holding the bed of ore on the
// pans. Ore spills off the head end into the discharge chute.
// Millimetres, Z up, head (discharge and drive) at -X towards the viewer,
// tail and feed hopper at +X, drive on the -Y side.
meta({
  name: "apron-feeder",
  license: 'CC0-1.0',
  title: "Heavy-duty apron feeder",
  description: "Heavy-duty apron feeder at about real size: overlapping manganese pans on twin crawler chains running over carrier rollers between deep side girders on pedestals, head sprocket shaft with shaft-mounted gearbox, torque arm and motor, tail idler with screw take-up, skirt plates with rubber seals under a lofted feed hopper, a bed of ore spilling off the head into a discharge chute, and a walkway with handrail. Material controls: girder coating, manganese pans and chain, drive and skirt steel and ore, plus a pan width choice (1.5, 2.1 or 2.7 m) that resizes the feeder. weathered, highVisibility and greenPlant presets.",
  tags: ['mining', 'ore handling', 'apron feeder', 'pan feeder', 'crusher feed', 'chain conveyor', 'crushing plant', 'bulk materials'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#d9831f', { label: 'Girder coating' });
const panSteel = param('panSteel', '#7f8482', { label: 'Manganese pans and chain' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Drive and skirt steel' });
const ore = param('ore', '#8a7d6c', { label: 'Ore' });
const panWidth = param('panWidth', '2.1 m', { choices: ['1.5 m', '2.1 m', '2.7 m'], label: 'Pan width' });
presets({
  weathered: { coatedSteel: '#8a7458', panSteel: '#6c6660', structuralSteel: '#666a66', ore: '#7d7062' },
  highVisibility: { coatedSteel: '#f0a81c', panSteel: '#9aa09c', structuralSteel: '#465159', ore: '#9a8b78' },
  greenPlant: { coatedSteel: '#3f8a4e', panSteel: '#8a8f8c', structuralSteel: '#2d3134', ore: '#6f4a3a' },
});

const p = assembly("apron-feeder");
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
// Round bar along Y from y0 to y1, centred on (x, z); along X from x0 to x1, centred on (y, z).
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
const cylX = (r, x0, x1, y, z, n = 12) => rod(r, x0, x1, n).rotateY(90).translate(0, y, z);
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
const rect = (x0, x1, hy) => path().moveTo(x0, -hy).lineTo(x1, -hy).lineTo(x1, hy).lineTo(x0, hy).close();

const oreDark = '#6f6457', dark = '#1e2123', rubber = '#25292b', warn = '#e8c21e';
const B = { '1.5 m': 750, '2.1 m': 1050, '2.7 m': 1350 }[panWidth.value]; // pan half-width
const L = 11000; // sprocket centres
const Zp = 1700; // top of the carrying pans
const Rs = 520; // sprocket pitch radius
const Za = Zp - Rs - 60; // sprocket and idler axis
const Yg = B + 180; // girder inner face

// ---- Side girders on pedestals ----
for (const [k, s] of [-1, 1].entries()) {
  const y0 = Math.min(s * Yg, s * (Yg + 160)), y1 = Math.max(s * Yg, s * (Yg + 160));
  add(`side-girder-${k}`, blk(-200, y0, Za - 650, L + 200, y1, Zp - 140).color(coatedSteel));
  const f0 = Math.min(s * (Yg - 60), s * (Yg + 220)), f1 = Math.max(s * (Yg - 60), s * (Yg + 220));
  add(`girder-top-flange-${k}`, blk(-200, f0, Zp - 200, L + 200, f1, Zp - 140).color(coatedSteel));
  for (let x = 900; x < L; x += 1400) add(`girder-stiffener-${k}-${x}`, blk(x - 30, s > 0 ? y1 : y0 - 70, Za - 650, x + 30, s > 0 ? y1 + 70 : y0, Zp - 200).color(coatedSteel));
  for (const [j, x] of [600, 4200, 7800, L - 500].entries()) {
    add(`pedestal-${k}-${j}`, blk(x - 220, s * (Yg + 80) - 220, 0, x + 220, s * (Yg + 80) + 220, Za - 650).color(structuralSteel));
    add(`pedestal-base-${k}-${j}`, blk(x - 380, s * (Yg + 80) - 380, 0, x + 380, s * (Yg + 80) + 380, 60).color(structuralSteel));
  }
}
for (const [j, x] of [600, 4200, 7800, L - 500].entries()) add(`cross-tie-${j}`, blk(x - 120, -Yg, Za - 650, x + 120, Yg, Za - 450).color(structuralSteel));

// ---- Pans: carrying strand on top, return strand underneath ----
const pitch = 610, nPan = Math.floor(L / pitch);
for (let i = 0; i < nPan; i++) {
  const x = 120 + i * pitch;
  add(`pan-${i}`, blk(x, -B, Zp - 70, x + pitch + 40, B, Zp).color(panSteel));
  add(`pan-lip-${i}`, blk(x + pitch - 20, -B, Zp, x + pitch + 40, B, Zp + 70).color(panSteel));
  if (i % 2 === 0) add(`return-pan-${i}`, blk(x, -B, Za - Rs - 20, x + 2 * pitch - 30, B, Za - Rs + 50).color(panSteel));
}
// Chain links along both strands, just inside the girders.
for (const [k, s] of [-1, 1].entries()) {
  for (let i = 0; i < nPan; i++) {
    const x = 120 + i * pitch, y = s * (B - 140);
    add(`chain-link-${k}-${i}`, blk(x + 40, y - 90, Zp - 230, x + pitch - 40, y + 90, Zp - 70).color(dark));
  }
  add(`return-chain-${k}`, blk(200, s * (B - 140) - 90, Za - Rs - 160, L - 200, s * (B - 140) + 90, Za - Rs - 20).color(dark));
}
for (let x = 1200; x < L - 400; x += 1200) {
  add(`carrier-roller-${x}`, cylY(130, -B + 60, B - 60, x, Zp - 360, 10).color(structuralSteel));
}

// ---- Head sprocket, shaft-mounted gearbox and motor (-X, -Y side) ----
add('head-shaft', cylY(170, -Yg - 1250, Yg + 450, 0, Za, 12).color(panSteel));
for (const [k, s] of [-1, 1].entries()) {
  add(`head-sprocket-${k}`, cylY(Rs + 40, s * (B - 140) - 110, s * (B - 140) + 110, 0, Za, 12).color(dark));
  add(`head-bearing-${k}`, blk(-320, s > 0 ? Yg + 160 : -Yg - 420, Za - 280, 320, s > 0 ? Yg + 420 : -Yg - 160, Za + 260).color(structuralSteel));
}
add('gearbox', blk(-650, -Yg - 1150, Za - 600, 650, -Yg - 520, Za + 700).color(coatedSteel));
add('gearbox-input-housing', cylX(320, 650, 1100, -Yg - 830, Za + 330, 12).color(coatedSteel));
add('motor-coupling-guard', cylX(260, 1100, 1550, -Yg - 830, Za + 330, 10).color(warn));
add('drive-motor', cylX(430, 1550, 3100, -Yg - 830, Za + 330, 14).color(structuralSteel));
for (let x = 1750; x < 3000; x += 250) add(`motor-fin-${x}`, cylX(470, x, x + 60, -Yg - 830, Za + 330, 14).color(structuralSteel));
add('motor-fan-cowl', cylX(400, 3100, 3400, -Yg - 830, Za + 330, 14).color(dark));
add('motor-terminal-box', blk(2000, -Yg - 1050, Za + 720, 2500, -Yg - 610, Za + 960).color(structuralSteel));
add('torque-arm', blk(400, -Yg - 980, Za - 900, 560, -Yg - 680, Za - 500).color(structuralSteel));
add('torque-arm-anchor', blk(250, -Yg - 1100, 0, 710, -Yg - 560, Za - 900).color(structuralSteel));
add('motor-bracket', blk(1500, -Yg - 1150, Za - 220, 3300, -Yg - 520, Za - 110).color(structuralSteel));
add('motor-bracket-leg', blk(2900, -Yg - 1050, 0, 3100, -Yg - 620, Za - 220).color(structuralSteel));

// ---- Tail idler and screw take-up (+X) ----
add('tail-idler', cylY(Rs - 40, -B + 40, B - 40, L, Za, 14).color(panSteel));
for (const [k, s] of [-1, 1].entries()) {
  const ya = s * (Yg + 160), yb = s * (Yg + 420);
  add(`take-up-block-${k}`, blk(L - 300, Math.min(ya, yb), Za - 220, L + 250, Math.max(ya, yb), Za + 220).color(structuralSteel));
  add(`take-up-screw-${k}`, cylX(55, L + 250, L + 1000, s * (Yg + 290), Za, 8).color(panSteel));
  add(`take-up-nut-${k}`, blk(L + 900, s * (Yg + 290) - 120, Za - 120, L + 1000, s * (Yg + 290) + 120, Za + 120).color(warn));
}

// ---- Skirts, feed hopper and ore bed ----
const Xs = 3200, Hs = 1200;
for (const [k, s] of [-1, 1].entries()) {
  const ya = s * (B - 60), yb = s * (B - 10);
  add(`skirt-plate-${k}`, blk(Xs, Math.min(ya, yb), Zp + 120, L + 200, Math.max(ya, yb), Zp + Hs).color(structuralSteel));
  add(`skirt-seal-${k}`, blk(Xs, Math.min(ya, yb) - 10, Zp + 70, L + 200, Math.max(ya, yb) + 10, Zp + 170).color(rubber));
  for (let x = Xs + 600; x < L; x += 1200) add(`skirt-clamp-${k}-${x}`, blk(x - 60, s > 0 ? B - 10 : -B - 50, Zp + 200, x + 60, s > 0 ? B + 50 : -B + 10, Zp + Hs - 100).color(structuralSteel));
}
add('feed-hopper', rect(6500, L + 200, B - 10).loft([rect(5600, L + 1200, B + 1400)], { planes: [{ plane: 'XY', origin: [0, 0, Zp + Hs] }, { plane: 'XY', origin: [0, 0, Zp + Hs + 2200] }], ruled: true })
  .subtract(rect(6560, L + 140, B - 70).loft([rect(5660, L + 1140, B + 1340)], { planes: [{ plane: 'XY', origin: [0, 0, Zp + Hs - 10] }, { plane: 'XY', origin: [0, 0, Zp + Hs + 2210] }], ruled: true })).color(coatedSteel));
add('ore-bed', profileXZ([[2000, Zp + 70], [L + 100, Zp + 70], [L + 100, Zp + Hs + 700], [6800, Zp + Hs + 500], [Xs + 200, Zp + Hs - 250], [2900, Zp + 650]], 2 * B - 140).color(ore));
add('ore-heap', sphere(1000).scale([2.3, (B + 500) / 1000, 0.95]).translate(8600, 0, Zp + Hs + 1250).subtract(blk(6000, -B - 600, Zp + Hs, 11000, B + 600, Zp + Hs + 700)).color(ore));
for (const [k, [x, y, r]] of [[900, -0.4 * B, 200], [1600, 0.35 * B, 240], [2700, -0.2 * B, 280], [7600, -0.3 * B, 380], [9300, 0.3 * B, 340]].entries()) {
  add(`ore-lump-${k}`, sphere(r).translate(x, y, Zp + (x < 2000 ? r : x < Xs ? 600 : Hs + 1900)).color(k % 2 ? oreDark : ore));
}

// ---- Discharge chute and falling ore at the head ----
const fz = (x) => Zp - 500 + ((x + 100) * (Zp - 800)) / 1700; // chute floor top
add('discharge-chute-floor', profileXZ([[-100, fz(-100)], [-1800, fz(-1800)], [-1800, fz(-1800) - 120], [-100, fz(-100) - 120]], 2 * B + 300).color(structuralSteel));
for (const [k, s] of [-1, 1].entries()) {
  add(`discharge-chute-side-${k}`, profileXZ([[-100, fz(-100) - 120], [-1800, fz(-1800) - 120], [-1800, fz(-1800) + (s < 0 ? 300 : 700)], [-100, fz(-100) + (s < 0 ? 300 : 700)]], 50).translate(0, s * (B + 175), 0).color(structuralSteel));
}
for (const [k, s] of [-1, 1].entries()) add(`chute-leg-${k}`, blk(-1750, s * (B + 150) - 60, 0, -1630, s * (B + 150) + 60, fz(-1700) - 100).color(structuralSteel));
add('ore-falling', profileXZ([[-80, Zp + 50], [-400, Zp - 150], [-800, fz(-800) + 200], [-1750, fz(-1750) + 150], [-1750, fz(-1750) + 5], [-300, fz(-300) + 5], [-60, Zp - 120]], 2 * B - 300).color(oreDark));

// ---- Walkway and handrail on the +Y side ----
const Yw = Yg + 500;
add('walkway', blk(-200, Yw, Za - 60, L, Yw + 900, Za).color(structuralSteel));
for (const [k, x] of [0, 2700, 5400, 8100, L - 200].entries()) {
  add(`handrail-post-${k}`, rod(25, Za, Za + 1100, 6).translate(x, Yw + 860, 0).color(warn));
  add(`walkway-leg-${k}`, blk(x - 50, Yw + 400, 0, x + 50, Yw + 500, Za - 60).color(structuralSteel));
}
add('handrail-top', tube([0, Yw + 860, Za + 1100], [L - 200, Yw + 860, Za + 1100], 25, 6).color(warn));
add('handrail-mid', tube([0, Yw + 860, Za + 560], [L - 200, Yw + 860, Za + 560], 20, 6).color(warn));

return p.model();
