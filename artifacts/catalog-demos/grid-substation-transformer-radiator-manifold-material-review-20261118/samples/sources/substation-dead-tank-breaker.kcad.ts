// SPDX-License-Identifier: CC0-1.0
// Dead tank SF6 circuit breaker, the North-American style breaker whose
// interrupters sit inside earthed steel tanks. What makes it one: three
// horizontal cylindrical tanks with domed ends on a raised steel frame; each
// tank carries two tall shedded entrance bushings splayed outward in a V,
// each seated on a fat current-transformer housing; aluminium terminal pads
// at the bushing tops; gas piping and density monitors between the tanks;
// a large operating mechanism cabinet at one end of the frame; tank heaters
// and earthing pads below. Millimetres, Z up, ground origin, tanks along Y,
// phases along X.
meta({
  name: "substation-dead-tank-breaker",
  license: "CC0-1.0",
  title: "Dead tank circuit breaker",
  description: "Three-phase dead tank SF6 circuit breaker at about real size: three earthed horizontal tanks with domed ends and girth bands on a braced steel frame with concrete footings, two shedded entrance bushings per tank splayed in a V on current-transformer housings, aluminium terminal pads, gas manifold with density monitors, tank heaters, and an end-mounted operating mechanism cabinet with door, window and handle. Material controls: galvanised frame, tank and cabinet paint, bushing porcelain, terminals; weathered, maintenance and grey-porcelain presets.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "circuit breaker", "dead tank breaker", "SF6", "bushings", "current transformer", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 7000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#8a969b', { label: 'Galvanized steel frame' });
const powderCoat = param('powderCoat', '#c3c8c4', { label: 'Tank and cabinet paint' });
const porcelain = param('porcelain', '#7b4632', { label: 'Bushing porcelain' });
const copper = param('copper', '#c9ced1', { label: 'Aluminium terminals' });
presets({
  weathered: { galvanizedSteel: '#778080', powderCoat: '#9ea39b', porcelain: '#6a4434', copper: '#a3a49c' },
  maintenance: { powderCoat: '#cf7736' },
  greyPorcelain: { porcelain: '#8c9396', powderCoat: '#6f8277' },
});

const p = assembly("substation-dead-tank-breaker");
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
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Square member from point a to point b.
const strut = (a, b, w) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return blk(-w / 2, -w / 2, 0, w / 2, w / 2, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Shedded insulator from z=0 to h: core radius rc, sheds alternating rs and 0.8 rs.
const sheds = (h, rc, rs, pitch) => {
  const pts = [[rc, 0]];
  let i = 0;
  for (let z = pitch * 0.5; z + pitch * 0.6 < h; z += pitch, i++) {
    const r = i % 2 ? rs * 0.8 : rs;
    pts.push([r, z], [r, z + pitch * 0.12], [rc, z + pitch * 0.45]);
  }
  pts.push([rc, h]);
  return lathe(pts, 8);
};

const concrete = '#9a9890', dark = '#2c3033';
const phases = [-1300, 0, 1300];
const tankZ = 2050, tankR = 460, tankL = 1100; // axis height, radius, half-length along Y
const splay = 16; // bushing lean from vertical, degrees

// ---- Footings and raised frame ----
for (const x of [-2000, 2000]) for (const y of [-900, 900]) {
  add(`footing-${x}-${y}`, blk(x - 230, y - 230, 0, x + 230, y + 230, 250).color(concrete));
  add(`leg-${x}-${y}`, blk(x - 80, y - 80, 250, x + 80, y + 80, 1450).color(galvanizedSteel));
}
for (const y of [-900, 900]) {
  add(`rail-${y}`, blk(-2150, y - 90, 1450, 2150, y + 90, 1580).color(galvanizedSteel));
  add(`frame-brace-${y}-a`, strut([-2000, y, 300], [-200, y, 1450], 60).color(galvanizedSteel));
  add(`frame-brace-${y}-b`, strut([2000, y, 300], [200, y, 1450], 60).color(galvanizedSteel));
}
for (const x of [-2000, 2000]) add(`frame-end-${x}`, blk(x - 70, -900, 1450, x + 70, 900, 1580).color(galvanizedSteel));

phases.forEach((x, i) => {
  const n = `phase-${i + 1}`;
  // Tank: cylinder along Y with domed ends, girth bands and saddles.
  add(`${n}-tank`, lathe([[tankR * 0.55, -tankL - 220], [tankR * 0.88, -tankL - 120], [tankR, -tankL], [tankR, tankL], [tankR * 0.88, tankL + 120], [tankR * 0.55, tankL + 220]], 14).rotateX(-90).translate(x, 0, tankZ).color(powderCoat));
  for (const y of [-tankL + 40, tankL - 40]) add(`${n}-girth-${y}`, rod(tankR + 25, -40, 40, 14).rotateX(-90).translate(x, y, tankZ).color(powderCoat));
  for (const y of [-900, 900]) add(`${n}-saddle-${y}`, blk(x - 330, y - 80, 1580, x + 330, y + 80, tankZ - tankR + 80).color(galvanizedSteel));
  add(`${n}-heater`, blk(x - 220, -500, tankZ - tankR - 70, x + 220, 500, tankZ - tankR + 10).color(dark));
  // Two bushings per tank, splayed outward in Y.
  for (const s of [-1, 1]) {
    const b = `${n}-bushing-${s > 0 ? 'b' : 'a'}`;
    const lean = (shape) => shape.rotateX(-s * splay).translate(x, s * 520, tankZ + tankR - 80);
    add(`${b}-nozzle`, lean(rod(260, -200, 120, 12)).color(powderCoat));
    add(`${b}-ct-housing`, lean(lathe([[330, 120], [360, 170], [360, 520], [300, 580]], 12)).color(powderCoat));
    add(`${b}-flange`, lean(rod(220, 580, 650, 10)).color(copper));
    add(`${b}-porcelain`, lean(sheds(2300, 120, 220, 200).translate(0, 0, 650)).color(porcelain));
    add(`${b}-head`, lean(lathe([[170, 2950], [170, 3100], [110, 3200]], 10)).color(copper));
    add(`${b}-stud`, lean(rod(35, 3200, 3330, 8)).color(copper));
    add(`${b}-pad`, lean(blk(-70, -14, 3300, 70, 14, 3480)).color(copper));
  }
  // Gas density monitor on the tank end.
  add(`${n}-density-monitor`, rod(80, 0, 60, 10).rotateX(90).translate(x, -tankL - 220, tankZ - 150).color(dark));
  add(`${n}-density-dial`, rod(60, 0, 8, 10).rotateX(90).translate(x, -tankL - 280, tankZ - 150).color('#e9e6dc'));
});

// ---- Gas manifold and operating linkage along the frame ----
add('gas-manifold', rod(22, 0, 3000, 8).rotateY(90).translate(-1500, -tankL - 120, tankZ - 380).color(copper));
for (const x of phases) add(`gas-drop-${x}`, rod(22, tankZ - 380, tankZ - 200, 8).translate(x, -tankL - 120, 0).color(copper));
add('linkage-housing', blk(-1700, -160, tankZ - tankR - 40, 2150, 160, tankZ - tankR + 60).color(powderCoat));

// ---- End-mounted operating mechanism cabinet (+X) ----
add('mechanism-cabinet', blk(2150, -800, 600, 2900, 800, 2450).color(powderCoat));
add('mechanism-roof', blk(2110, -850, 2450, 2940, 850, 2530).color(powderCoat));
add('mechanism-plinth', blk(2150, -800, 250, 2900, 800, 600).color(galvanizedSteel));
add('mechanism-door', blk(2210, -815, 660, 2840, -800, 2390).color(powderCoat));
add('mechanism-door-split', blk(2520, -820, 660, 2530, -815, 2390).color(dark));
for (const x of [2230, 2810]) for (const z of [800, 2200]) add(`mechanism-hinge-${x}-${z}`, blk(x - 15, -830, z, x + 15, -815, z + 80).color(dark));
add('mechanism-window', blk(2280, -822, 1800, 2480, -815, 2100).color('#8fb4c4'));
add('mechanism-handle', blk(2560, -850, 1350, 2590, -815, 1600).color(dark));
add('mechanism-vent', blk(2600, -822, 800, 2800, -815, 900).color(dark));
add('earth-pad', blk(-2080, -1000, 900, -1920, -980, 1100).color('#b87545'));

return p.model();
