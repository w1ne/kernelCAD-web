// SPDX-License-Identifier: CC0-1.0
// Impact crusher module, a horizontal-shaft impactor (HSI) used as a primary
// or secondary crusher for softer ore and limestone. What makes it one: a
// square lower housing carrying a heavy rotor on a horizontal shaft, with
// manganese blow bars that fling the rock against impact aprons, under a
// rounded hood that is hinged at the back and lifted by hydraulic cylinders
// for liner changes. Apron adjustment spindles stick out of the hood, rock
// slides in down an inclined feed chute, and a big grooved flywheel sheave
// on the shaft end is driven by V-belts from a motor on the module deck.
// Crushed product drops through a chute onto a conveyor under the module.
// Millimetres, Z up, rotor shaft along Y, drive on the -Y (front) side, feed
// from -X, discharge conveyor towards +X.
meta({
  name: "impact-crusher-module",
  license: 'CC0-1.0',
  title: "Impact crusher module",
  description: "Horizontal-shaft impact crusher at about real size on a raised steel module: square lower housing with an inspection door, rounded impact hood hinged at the back with hydraulic opening cylinders, liner bolt rows and stiffening ribs, apron adjustment spindles, heavy rotor with four manganese blow bars, grooved flywheel sheave on V-belts from a drive motor on its own deck, inclined feed chute carrying run-of-mine rock, discharge chute and inclined product conveyor, service deck with handrail and ladder. Material controls: crusher coating, module and drive steel, manganese wear parts, belts and rubber, plus a hood choice (closed for running, open for a blow-bar change showing the rotor). weathered, highVisibility and greenPlant presets.",
  tags: ['mining', 'mineral processing', 'crushing', 'impact crusher', 'horizontal shaft impactor', 'HSI', 'V-belt drive', 'crushing plant'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#d9831f', { label: 'Crusher coating' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Module and drive steel' });
const manganeseSteel = param('manganeseSteel', '#8d918e', { label: 'Manganese wear parts' });
const rubber = param('rubber', '#25292b', { label: 'Belts and rubber' });
const hoodState = param('hoodState', 'closed', { choices: ['closed', 'open'], label: 'Impact hood' });
presets({
  weathered: { coatedSteel: '#8a7458', structuralSteel: '#666a66', manganeseSteel: '#77706a', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#f0a81c', structuralSteel: '#465159', manganeseSteel: '#a2a7a4', rubber: '#24282a' },
  greenPlant: { coatedSteel: '#3f8a4e', structuralSteel: '#2d3134', manganeseSteel: '#9a9f9c', rubber: '#1d2022' },
});

const p = assembly("impact-crusher-module");
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

const rock = '#8a7d6c', rockDark = '#6f6457', dark = '#1e2123', warn = '#e8c21e';
const open = hoodState.value === 'open';
const Zb = 1800; // crusher seat on the module
const HX = 1600, HY = 1200, R = 1600, Zr = Zb + 1300; // housing half-sizes, hood radius, rotor axis
// The hood hinges about a Y axis at its back (+X) edge.
const HA = open ? 68 : 0;
const hood = (s) => (open ? s.translate(-HX, 0, -Zr).rotateY(HA).translate(HX, 0, Zr) : s);
const hoodPt = (x, z) => {
  const a = (HA * Math.PI) / 180, dx = x - HX, dz = z - Zr;
  return [HX + dx * Math.cos(a) + dz * Math.sin(a), Zr - dx * Math.sin(a) + dz * Math.cos(a)];
};
const arc = (r, a0, a1, steps) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
  return [r * Math.cos(a), Zr + r * Math.sin(a)];
});

// ---- Raised steel module ----
for (const [k, [x, y]] of [[-1700, -1300], [-1700, 1300], [1700, -1300], [1700, 1300], [4300, -1900], [4300, 700]].entries()) {
  add(`module-column-${k}`, blk(x - 150, y - 150, 0, x + 150, y + 150, Zb - 100).color(structuralSteel));
  add(`column-base-${k}`, blk(x - 280, y - 280, 0, x + 280, y + 280, 50).color(structuralSteel));
}
for (const [k, y] of [-1300, 1300].entries()) add(`ring-beam-x-${k}`, blk(-1850, y - 150, Zb - 500, 1850, y + 150, Zb).color(structuralSteel));
for (const [k, x] of [-1700, 1700].entries()) add(`ring-beam-y-${k}`, blk(x - 150, -1450, Zb - 500, x + 150, 1450, Zb).color(structuralSteel));
add('motor-deck', blk(1850, -2050, Zb - 120, 4450, 850, Zb).color(structuralSteel));
for (const [k, y] of [-1300, 1300].entries()) add(`module-brace-${k}`, tube([-1700, y, 300], [1700, y, Zb - 500], 70, 6).color(structuralSteel));

// ---- Lower housing (open box so the rotor shows when the hood is up) ----
add('lower-housing', blk(-HX, -HY, Zb, HX, HY, Zr).subtract(blk(-HX + 110, -HY + 110, Zb - 10, HX - 110, HY - 110, Zr + 10)).color(coatedSteel));
add('housing-flange', blk(-HX - 60, -HY - 60, Zr - 90, HX + 60, HY + 60, Zr).subtract(blk(-HX + 110, -HY + 110, Zr - 100, HX - 110, HY - 110, Zr + 10)).color(coatedSteel));
add('inspection-door', blk(-1250, -HY - 50, Zb + 250, -350, -HY, Zb + 1000).color(coatedSteel));
for (const [k, z] of [Zb + 380, Zb + 870].entries()) add(`door-hinge-${k}`, blk(-1320, -HY - 90, z - 50, -1230, -HY - 20, z + 50).color(structuralSteel));
for (const [k, z] of [Zb + 450, Zb + 800].entries()) add(`door-wedge-${k}`, blk(-460, -HY - 110, z - 40, -360, -HY - 40, z + 40).color(warn));
add('bearing-housing-front', cylY(330, -HY - 260, -HY, 0, Zr, 12).color(structuralSteel));
add('bearing-housing-back', cylY(330, HY, HY + 260, 0, Zr, 12).color(structuralSteel));
add('bearing-pedestal-front', blk(-420, -HY - 260, Zb, 420, -HY, Zr - 200).color(structuralSteel));
add('bearing-pedestal-back', blk(-420, HY, Zb, 420, HY + 260, Zr - 200).color(structuralSteel));

// ---- Rotor with blow bars ----
add('rotor', cylY(640, -HY + 130, HY - 130, 0, Zr, 16).color(structuralSteel));
add('rotor-shaft', cylY(170, -HY - 600, HY + 300, 0, Zr, 12).color(manganeseSteel));
for (let k = 0; k < 4; k++) {
  add(`blow-bar-${k}`, blk(-80, -HY + 140, 560, 80, HY - 140, 760).rotateY(45 + 90 * k).translate(0, 0, Zr).color(manganeseSteel));
}

// ---- Impact hood: rounded top, inlet face towards the feed chute ----
const hoodOutline = [[-HX, Zr], ...arc(R, 0, 135, 9), [-HX, Zr + 600]];
add('impact-hood', hood(profileXZ(hoodOutline, 2 * HY)).color(coatedSteel));
const rib = [...arc(R + 70, 2, 133, 9), ...arc(R - 10, 133, 2, 9)];
for (const [k, y] of [-HY + 40, -400, 400, HY - 40].entries()) {
  add(`hood-rib-${k}`, hood(profileXZ(rib, 90).translate(0, y, 0)).color(coatedSteel));
}
// Liner bolt heads along the front cheek of the hood.
for (const [k, [x, z]] of arc(R - 180, 12, 124, 7).entries()) {
  add(`liner-bolt-${k}`, hood(blk(x - 45, -HY - 40, z - 45, x + 45, -HY + 5, z + 45)).color(dark));
}
add('hood-inlet-curtain', hood(profileXZ([[-HX - 10, Zr + 620], [-1150, Zr + 1110], [-1150, Zr + 1040], [-HX - 10, Zr + 540]], 2 * HY - 260)).color(rubber));
// Apron adjustment spindles on the back shoulder of the hood.
for (const [k, y] of [-650, 650].entries()) {
  const a = 38, ca = Math.cos((a * Math.PI) / 180), sa = Math.sin((a * Math.PI) / 180);
  const x0 = (R - 150) * ca, z0 = Zr + (R - 150) * sa;
  add(`apron-spindle-${k}`, hood(tube([x0, y, z0], [x0 + 900 * ca, y, z0 + 900 * sa], 75, 8)).color(manganeseSteel));
  add(`spindle-housing-${k}`, hood(tube([x0 + 100 * ca, y, z0 + 100 * sa], [x0 + 450 * ca, y, z0 + 450 * sa], 150, 8)).color(structuralSteel));
  add(`spindle-nut-${k}`, hood(tube([x0 + 820 * ca, y, z0 + 820 * sa], [x0 + 920 * ca, y, z0 + 920 * sa], 130, 6)).color(warn));
}
for (const [k, y] of [-HY + 150, HY - 150].entries()) {
  add(`hood-hinge-${k}`, cylY(130, y - 120, y + 120, HX, Zr, 10).color(structuralSteel));
}
// Hydraulic hood cylinders on both cheeks.
for (const [k, y] of [-HY - 90, HY + 90].entries()) {
  const top = hoodPt(500, Zr + 1150);
  const base = [1350, y, Zb + 250];
  const mid = [base[0] + (top[0] - base[0]) * 0.55, y, base[2] + (top[1] - base[2]) * 0.55];
  add(`hood-cylinder-${k}`, tube(base, mid, 95, 8).color(warn));
  add(`hood-cylinder-rod-${k}`, tube(mid, [top[0], y, top[1]], 50, 8).color(manganeseSteel));
  add(`hood-cylinder-lug-${k}`, blk(1250, y - 50, Zb + 150, 1450, y + 50, Zb + 350).color(structuralSteel));
}

// ---- Flywheel sheave, V-belts and drive motor ----
const sy0 = -HY - 900, sy1 = -HY - 580, Rs = 950;
add('flywheel-rim', cylY(Rs, sy0, sy1, 0, Zr, 24).subtract(cylY(Rs - 120, sy0 - 10, sy1 + 10, 0, Zr, 24)).color(structuralSteel));
add('flywheel-web', cylY(Rs - 100, sy0 + 130, sy1 - 130, 0, Zr, 24).color(structuralSteel));
add('flywheel-hub', cylY(260, sy0 - 40, sy1 + 20, 0, Zr, 12).color(manganeseSteel));
for (let k = 0; k < 6; k++) {
  add(`flywheel-window-${k}`, cylY(170, sy0 + 110, sy0 + 140, 560 * Math.cos((k * Math.PI) / 3), Zr + 560 * Math.sin((k * Math.PI) / 3), 10).color(dark));
}
const mx = 3300, mz = Zb + 700, Rm = 340;
add('motor-sheave', cylY(Rm, sy0, sy1, mx, mz, 16).color(structuralSteel));
const beltYs = [sy0 + 50, sy0 + 130, sy0 + 210, sy0 + 290];
for (const [k, y] of beltYs.entries()) {
  add(`v-belt-top-${k}`, tube([0, y, Zr + Rs + 10], [mx, y, mz + Rm + 10], 24, 4).color(rubber));
  add(`v-belt-bottom-${k}`, tube([0, y, Zr - Rs - 10], [mx, y, mz - Rm - 10], 24, 4).color(rubber));
}
add('motor-shaft', cylY(90, sy1 - 20, -1450, mx, mz, 8).color(manganeseSteel));
add('motor-body', cylY(600, -1450, 300, mx, mz, 16).color(coatedSteel));
for (const [k, y] of [-1200, -900, -600, -300, 0].entries()) add(`motor-fin-${k}`, cylY(650, y, y + 70, mx, mz, 16).color(coatedSteel));
add('motor-fan-cowl', cylY(560, 300, 600, mx, mz, 16).color(structuralSteel));
add('motor-terminal-box', blk(mx - 260, -700, mz + 560, mx + 260, -200, mz + 820).color(structuralSteel));
add('motor-slide-base', blk(mx - 750, -1650, Zb, mx + 750, 650, Zb + 120).color(structuralSteel));
add('motor-feet', blk(mx - 550, -1450, Zb + 120, mx + 550, 300, mz - 450).color(structuralSteel));

// ---- Inclined feed chute with run-of-mine rock ----
const fx0 = -4500, fz0 = Zb + 3150, fx1 = -HX + 60, fz1 = Zr + 650;
const fl = (x) => fz0 + ((fz1 - fz0) * (x - fx0)) / (fx1 - fx0);
add('feed-chute-floor', profileXZ([[fx0, fz0], [fx1, fz1], [fx1, fz1 - 80], [fx0, fz0 - 80]], 1900).color(coatedSteel));
add('feed-chute-side-front', profileXZ([[fx0, fz0], [fx1, fz1], [fx1, fz1 + 380], [fx0, fz0 + 380]], 60).translate(0, -980, 0).color(coatedSteel));
add('feed-chute-side-back', profileXZ([[fx0, fz0], [fx1, fz1], [fx1, fz1 + 750], [fx0, fz0 + 750]], 60).translate(0, 980, 0).color(coatedSteel));
add('feed-chute-backplate', blk(fx0 - 80, -1010, fz0 - 80, fx0, 1010, fz0 + 900).color(coatedSteel));
add('feed-chute-liner', profileXZ([[fx0 + 100, fl(fx0 + 100) + 5], [fx1 - 40, fl(fx1 - 40) + 5], [fx1 - 40, fl(fx1 - 40) + 30], [fx0 + 100, fl(fx0 + 100) + 30]], 1750).color(manganeseSteel));
add('ore-on-chute', profileXZ([[fx0 + 100, fl(fx0 + 100) + 30], [fx1 - 250, fl(fx1 - 250) + 30], [fx1 - 600, fl(fx1 - 600) + 190], [fx0 + 100, fl(fx0 + 100) + 330]], 1650).color(rock));
for (const [k, [x, y]] of [[-4000, -450], [-3500, 350], [-3000, -150], [-2500, 500], [-2100, -500]].entries()) {
  add(`ore-lump-${k}`, sphere(170 + (k % 2) * 60).translate(x, y, fl(x) + 260).color(k % 2 ? rockDark : rock));
}
for (const [k, y] of [-900, 900].entries()) {
  add(`chute-leg-${k}`, blk(fx0 + 50, y - 110, 0, fx0 + 270, y + 110, fl(fx0 + 160) - 80).color(structuralSteel));
  add(`chute-leg-foot-${k}`, blk(fx0, y - 220, 0, fx0 + 320, y + 220, 50).color(structuralSteel));
}
add('chute-leg-tie', blk(fx0 + 80, -900, 1800, fx0 + 240, 900, 1950).color(structuralSteel));

// ---- Discharge chute and product conveyor (towards +X) ----
const rect = (hx, hy) => path().moveTo(-hx, -hy).lineTo(hx, -hy).lineTo(hx, hy).lineTo(-hx, hy).close();
add('discharge-chute', rect(800, 650).loft([rect(HX - 120, HY - 120)], { planes: [{ plane: 'XY', origin: [0, 0, 1450] }, { plane: 'XY', origin: [0, 0, Zb] }], ruled: true }).color(structuralSteel));
const cx0 = -1900, cz0 = 650, cx1 = 8000, cz1 = 2900;
const slope = Math.atan2(cz1 - cz0, cx1 - cx0);
const len = Math.hypot(cx1 - cx0, cz1 - cz0);
const onBelt = (s) => s.rotateY((-slope * 180) / Math.PI).translate(cx0, 0, cz0);
for (const [k, y] of [-700, 700].entries()) add(`conveyor-stringer-${k}`, onBelt(blk(0, y - 60, -140, len, y + 60, 40)).color(structuralSteel));
add('conveyor-belt', onBelt(blk(0, -600, 40, len, 600, 100)).color(rubber));
add('product-ridge', onBelt(extrudePolygon([[-450, 100], [450, 100], [180, 230], [-180, 240]], len - 1700).rotateY(90).rotateX(90).translate(1600, 0, 0)).color(rockDark));
add('head-pulley', cylY(280, -650, 650, cx1, cz1 + 60, 12).color(structuralSteel));
add('tail-pulley', cylY(240, -650, 650, cx0, cz0 + 60, 12).color(structuralSteel));
for (const [k, t] of [0.45, 0.82].entries()) {
  const x = cx0 + (cx1 - cx0) * t, z = cz0 + (cz1 - cz0) * t;
  for (const [j, y] of [-700, 700].entries()) add(`conveyor-leg-${k}-${j}`, blk(x - 60, y - 60, 0, x + 60, y + 60, z - 160).color(structuralSteel));
}
add('tail-stand', blk(cx0 - 120, -700, 0, cx0 + 120, 700, cz0 - 120).color(structuralSteel));

// ---- Service deck, handrail and ladder (+Y side) ----
add('service-deck', blk(-1850, HY + 300, Zb - 60, 1850, HY + 1300, Zb).color(structuralSteel));
for (const [k, x] of [-1800, 0, 1800].entries()) add(`handrail-post-${k}`, rod(25, Zb, Zb + 1100, 6).translate(x, HY + 1250, 0).color(warn));
add('handrail-top', tube([-1800, HY + 1250, Zb + 1100], [1800, HY + 1250, Zb + 1100], 25, 6).color(warn));
add('handrail-mid', tube([-1800, HY + 1250, Zb + 560], [1800, HY + 1250, Zb + 560], 20, 6).color(warn));
for (const [k, x] of [-1500, -1100].entries()) add(`ladder-rail-${k}`, rod(25, 0, Zb + 1000, 6).translate(x, HY + 1400, 0).color(warn));
for (let z = 300; z < Zb; z += 300) add(`ladder-rung-${z}`, tube([-1500, HY + 1400, z], [-1100, HY + 1400, z], 18, 4).color(warn));

return p.model();
