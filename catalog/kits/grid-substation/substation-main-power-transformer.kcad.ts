// SPDX-License-Identifier: CC0-1.0
// Main power transformer, the oil-filled step-down unit at the heart of a
// transmission substation bay. What makes it one: a ribbed steel tank on a
// rail-wheeled base frame; banks of tall pressed-steel panel radiators on
// both long sides, fed by header pipes and blown by cooling fans underneath;
// a row of tall shedded high-voltage bushings on turrets and a row of short
// low-voltage bushings; a horizontal oil conservator on brackets with its
// Buchholz pipe, gauge and silica-gel breather; an on-load tap-changer
// compartment with its motor-drive cabinet; a marshalling cabinet and an
// access ladder. Millimetres, Z up, plinth origin, length along X.
meta({
  name: "substation-main-power-transformer",
  license: "CC0-1.0",
  title: "Main power transformer",
  description: "Oil-filled main power transformer at about real size: ribbed tank on a rail-wheeled base frame and concrete plinth, six pressed-steel panel radiators with headers and underslung cooling fans, three tall shedded HV bushings plus neutral on turrets, three LV bushings, a bracketed oil conservator with Buchholz pipe, oil gauge and silica-gel breather, on-load tap-changer compartment with motor-drive cabinet, marshalling cabinet, pressure relief valve, lifting lugs and an access ladder. Material controls: tank enamel, radiators and fittings, bushing porcelain, terminals; weathered, maintenance and light-grey presets.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "power transformer", "oil-filled transformer", "bushings", "radiators", "conservator", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 10000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const transformerEnamel = param('transformerEnamel', '#5e7564', { label: 'Tank enamel' });
const stainlessSteel = param('stainlessSteel', '#a7afb1', { label: 'Radiators and fittings' });
const porcelain = param('porcelain', '#7b4632', { label: 'Bushing porcelain' });
const copper = param('copper', '#c27c48', { label: 'Terminals and connectors' });
presets({
  weathered: { stainlessSteel: '#8f9590', transformerEnamel: '#5d6a5a', porcelain: '#6a4434', copper: '#8f6f4c' },
  maintenance: { transformerEnamel: '#9a7040' },
  lightGrey: { transformerEnamel: '#b8bcb8', stainlessSteel: '#c9cdcd', porcelain: '#9da3a6' },
});

const p = assembly("substation-main-power-transformer");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising, n flat sides.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
// Open ring (fan shroud, lifting eye) as a true revolve.
const ring = (r0, r1, z0, z1) => path().moveTo(r0, z0).lineTo(r1, z0).lineTo(r1, z1).lineTo(r0, z1).close().revolve();
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Shedded insulator from z=0 to h: core radius rc, sheds alternating rs and 0.78 rs.
const sheds = (h, rc, rs, pitch) => {
  const pts = [[rc, 0]];
  let i = 0;
  for (let z = pitch * 0.5; z + pitch * 0.6 < h; z += pitch, i++) {
    const r = i % 2 ? rs * 0.78 : rs;
    pts.push([r, z], [r, z + pitch * 0.1], [rc, z + pitch * 0.4]);
  }
  pts.push([rc, h]);
  return lathe(pts, 8);
};

const concrete = '#9a9890', rail = '#3b3e40', dark = '#2a2e31';
const tx = 2600, ty = 1200, tz0 = 820, tz1 = 3820; // tank half-length, half-width, bottom, top

// ---- Plinth, rails, wheels and base frame ----
add('plinth', blk(-3900, -2500, 0, 3900, 2500, 250).color(concrete));
for (const y of [-900, 900]) add(`rail-${y}`, blk(-3600, y - 45, 250, 3600, y + 45, 330).color(rail));
for (const x of [-1900, 1900]) for (const y of [-900, 900]) {
  add(`wheel-${x}-${y}`, lathe([[260, -70], [260, -40], [220, -25], [220, 70]], 14).rotateX(y > 0 ? -90 : 90).translate(x, y, 550).color(rail));
  add(`bogie-${x}-${y}`, blk(x - 330, y - 140, 520, x + 330, y + 140, 700).color(transformerEnamel));
}
for (const y of [-900, 900]) add(`base-skid-${y}`, blk(-tx - 100, y - 160, 700, tx + 100, y + 160, tz0).color(transformerEnamel));

// ---- Tank: body, bottom and top flanges, vertical stiffeners, cover ----
add('main-tank', blk(-tx, -ty, tz0, tx, ty, tz1).color(transformerEnamel));
add('bottom-flange', blk(-tx - 60, -ty - 60, tz0, tx + 60, ty + 60, tz0 + 90).color(transformerEnamel));
add('top-flange', blk(-tx - 70, -ty - 70, tz1 - 90, tx + 70, ty + 70, tz1).color(transformerEnamel));
add('tank-cover', blk(-tx - 40, -ty - 40, tz1, tx + 40, ty + 40, tz1 + 70).color(transformerEnamel));
for (const x of [-2100, -850, 850, 2100]) for (const s of [-1, 1]) add(`side-stiffener-${x}-${s}`, blk(x - 50, s * ty - 70, tz0 + 90, x + 50, s * ty + 70, tz1 - 90).color(transformerEnamel));
for (const s of [-1, 1]) for (const y of [-500, 500]) add(`end-stiffener-${s}-${y}`, blk(s * tx - 70, y - 50, tz0 + 90, s * tx + 70, y + 50, tz1 - 90).color(transformerEnamel));
for (const x of [-tx + 150, tx - 150]) for (const y of [-ty + 150, ty - 150]) add(`lifting-lug-${x}-${y}`, blk(x - 90, y - 20, tz1 + 70, x + 90, y + 20, tz1 + 230).color(transformerEnamel));

// ---- Radiator banks on both long sides with headers and cooling fans ----
const radX = [-1700, 0, 1700];
for (const s of [-1, 1]) for (const cx of radX) {
  const y0 = s * (ty + 320), y1 = s * (ty + 880);
  for (let i = 0; i < 12; i++) {
    const x = cx - 270 + i * 49;
    add(`radiator-${s}-${cx}-panel-${i}`, blk(x - 11, Math.min(y0, y1), 1150, x + 11, Math.max(y0, y1), 3500).color(stainlessSteel));
  }
  for (const z of [1080, 3570]) {
    add(`radiator-${s}-${cx}-header-${z}`, blk(cx - 300, Math.min(y0, y1) + 200, z - 45, cx + 300, Math.min(y0, y1) + 360, z + 45).color(stainlessSteel));
    add(`radiator-${s}-${cx}-pipe-${z}`, rod(70, 0, 400).rotateX(-s * 90).translate(cx, s * ty, z).color(stainlessSteel));
    add(`radiator-${s}-${cx}-valve-${z}`, rod(110, 0, 50).rotateX(-s * 90).translate(cx, s * (ty + 150), z).color(dark));
  }
  // Fan under the radiator blowing upwards, on a bracket off the tank.
  const fy = s * (ty + 600);
  add(`fan-${s}-${cx}-shroud`, ring(300, 340, 820, 1000).translate(cx, fy, 0).color(stainlessSteel));
  add(`fan-${s}-${cx}-hub`, rod(70, 840, 980).translate(cx, fy, 0).color(dark));
  for (const a of [0, 120, 240]) add(`fan-${s}-${cx}-blade-${a}`, blk(60, -45, -8, 290, 45, 8).rotateX(18).rotateZ(a).translate(cx, fy, 908).color(dark));
  add(`fan-${s}-${cx}-bracket`, blk(cx - 30, Math.min(s * ty, fy), 880, cx + 30, Math.max(s * ty, fy), 940).color(stainlessSteel));
}

// ---- HV bushings (-Y row) on turrets, plus neutral, and LV bushings (+Y row) ----
const bushing = (name, x, y, turretH, h, rc, rs, pitch) => {
  const z0 = tz1 + 70;
  add(`${name}-turret`, rod(270, z0, z0 + turretH, 10).translate(x, y, 0).color(transformerEnamel));
  add(`${name}-ct-band`, rod(300, z0 + turretH * 0.35, z0 + turretH * 0.65, 10).translate(x, y, 0).color(transformerEnamel));
  add(`${name}-flange`, rod(210, z0 + turretH, z0 + turretH + 80).translate(x, y, 0).color(stainlessSteel));
  const zi = z0 + turretH + 80;
  add(`${name}-porcelain`, sheds(h, rc, rs, pitch).translate(x, y, zi).color(porcelain));
  add(`${name}-head`, lathe([[rc + 50, 0], [rc + 50, 160], [rc - 10, 260]], 10).translate(x, y, zi + h).color(stainlessSteel));
  add(`${name}-stud`, rod(32, zi + h + 260, zi + h + 420).translate(x, y, 0).color(copper));
  add(`${name}-pad`, blk(x - 60, y - 12, zi + h + 360, x + 60, y + 12, zi + h + 520).color(copper));
};
[-1500, -500, 500].forEach((x, i) => bushing(`hv-bushing-${i + 1}`, x, -600, 420, 2400, 130, 240, 210));
bushing('neutral-bushing', 1500, -600, 260, 900, 85, 150, 120);
[-1000, 0, 1000].forEach((x, i) => bushing(`lv-bushing-${i + 1}`, x, 450, 200, 950, 90, 165, 170));

// ---- Conservator on brackets, with Buchholz pipe, gauge and breather ----
const cy = 1350, cz = 5050, cr = 430, cx0 = -300, cx1 = 2500;
add('conservator', lathe([[cr * 0.55, cx0 - 130], [cr * 0.85, cx0 - 80], [cr, cx0], [cr, cx1], [cr * 0.85, cx1 + 80], [cr * 0.55, cx1 + 130]], 14).rotateY(90).translate(0, cy, cz).color(transformerEnamel));
for (const x of [cx0 + 300, cx1 - 300]) {
  for (const y of [cy - 300, cy + 300]) add(`conservator-leg-${x}-${y}`, blk(x - 45, y - 45, tz1 + 70, x + 45, y + 45, cz - 300).color(transformerEnamel));
  add(`conservator-saddle-${x}`, blk(x - 70, cy - 380, cz - 330, x + 70, cy + 380, cz - 250).color(transformerEnamel));
}
add('buchholz-pipe-riser', rod(60, tz1 + 70, 4400).translate(2050, 1000, 0).color(stainlessSteel));
add('buchholz-relay', blk(1920, 900, 4400, 2180, 1100, 4560).color(dark));
add('buchholz-pipe-top', rod(60, 4560, 4820).translate(2050, 1000, 0).color(stainlessSteel));
add('oil-gauge', rod(170, 0, 60).rotateY(90).translate(cx1 + 130, cy, cz).color(dark));
add('oil-gauge-face', rod(140, 60, 75).rotateY(90).translate(cx1 + 130, cy, cz).color('#e9e6dc'));
add('breather-pipe', rod(30, cz - 1400, cz - cr).translate(cx0 + 120, cy + 250, 0).color(stainlessSteel));
add('breather-canister', rod(110, cz - 1900, cz - 1400).translate(cx0 + 120, cy + 250, 0).color('#e48a3a'));
add('breather-cup', rod(80, cz - 2020, cz - 1900).translate(cx0 + 120, cy + 250, 0).color(dark));
add('pressure-relief', lathe([[160, 0], [160, 60], [110, 80], [110, 200]], 10).translate(-2100, 0, tz1 + 70).color(dark));

// ---- On-load tap changer (-X end) and marshalling cabinet (+X end) ----
add('oltc-compartment', blk(-tx - 420, -600, 1800, -tx, 400, tz1 - 120).color(transformerEnamel));
add('oltc-head', rod(280, tz1 - 120, tz1 + 120).translate(-tx - 210, -100, 0).color(transformerEnamel));
add('oltc-drive-cabinet', blk(-tx - 480, -500, 900, -tx - 60, 300, 1650).color(transformerEnamel));
add('oltc-drive-door', blk(-tx - 500, -460, 950, -tx - 480, 260, 1600).color(stainlessSteel));
add('oltc-drive-shaft', rod(25, 1650, 1800).translate(-tx - 270, -100, 0).color(dark));
add('marshalling-cabinet', blk(tx, -1000, 1100, tx + 420, -150, 2500).color(transformerEnamel));
add('marshalling-door', blk(tx + 420, -960, 1140, tx + 440, -190, 2460).color(stainlessSteel));
add('marshalling-handle', blk(tx + 440, -260, 1700, tx + 470, -230, 1900).color(dark));
add('rating-plate', blk(tx, 300, 2300, tx + 15, 800, 2650).color('#d9dcd6'));

// ---- Access ladder on the +X end ----
for (const y of [400, 850]) add(`ladder-stile-${y}`, blk(tx + 150, y - 25, tz0, tx + 200, y + 25, tz1 + 900).color(stainlessSteel));
for (let z = tz0 + 300; z < tz1 + 900; z += 300) add(`ladder-rung-${z}`, blk(tx + 160, 400, z - 15, tx + 190, 850, z + 15).color(stainlessSteel));
for (const y of [400, 850]) add(`ladder-standoff-${y}`, blk(tx, y - 20, 2500, tx + 150, y + 20, 2540).color(stainlessSteel));

return p.model();
