// Primary jaw crusher module, the first crushing stage that takes run-of-mine
// rock. What makes it one: a heavy frame of two thick side plates and a front
// wall holding a fixed jaw, a swing jaw (pitman) hung from an eccentric shaft
// so the two ridged manganese liners form a V-shaped chamber that is wide at
// the top and narrow at the discharge; two big flywheels on the shaft ends -
// one spoked, one a grooved sheave - driven by V-belts from a motor on a
// pivoting base; toggle and tension rod at the back; the whole on a raised
// steel stand with the discharge conveyor running out underneath.
// Millimetres, Z up, eccentric shaft along Y, discharge conveyor towards +X.
meta({
  name: "jaw-crusher-module",
  license: 'CC0-1.0',
  title: "Jaw crusher module",
  description: "Primary jaw crusher at about real size on a raised steel stand: thick profiled side plates and front wall, fixed and swing jaws with ridged manganese liners forming a V chamber full of rock, eccentric shaft in pillow blocks, a spoked flywheel and a grooved drive sheave, V-belt drive from a motor on a pivoting base, rear toggle adjustment cylinders and tension rod with spring, and an inclined discharge conveyor under the crusher carrying crushed ore. Material controls: crusher body coating, stand and drive steel, belts and rubber, manganese liners; weathered, highVisibility and yellowPlant presets.",
  tags: ['mining', 'mineral processing', 'crushing', 'jaw crusher', 'primary crusher', 'flywheel', 'V-belt drive', 'conveyor'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#4f8f5e', { label: 'Crusher body coating' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Stand and drive steel' });
const rubber = param('rubber', '#25292b', { label: 'Belts and rubber' });
const manganeseSteel = param('manganeseSteel', '#8e8b84', { label: 'Manganese jaw liners' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38', manganeseSteel: '#7a6a5a' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a', manganeseSteel: '#a3a19b' },
  yellowPlant: { coatedSteel: '#e2b01f', structuralSteel: '#2d3134', rubber: '#1d2022', manganeseSteel: '#9a968e' },
});

const p = assembly("jaw-crusher-module");
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
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Closed (x, z) side profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
// Crushed-ore ridge riding the belt: a low (y, z) section run along X.
const oreRidge = (xa, xb) => path().moveTo(-420, 60).lineTo(420, 60).lineTo(150, 200).lineTo(-150, 220).close()
  .extrude(xb - xa).rotateX(90).rotateZ(90).translate(xa, 0, 0);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const rock = '#8a7d6c', rockDark = '#6f6457', dark = '#1e2123';
const Zb = 1800; // crusher base on the stand
const Z = (z) => Zb + z;
const ex = -300, ez = Z(2650); // eccentric shaft centre

// ---- Raised stand ----
for (const [x, y] of [[-1450, -1250], [-1450, 1250], [1450, -1250], [1450, 1250], [-3900, -300], [-3900, 1500]]) {
  add(`stand-column-${x}-${y}`, blk(x - 160, y - 160, 0, x + 160, y + 160, Zb).color(structuralSteel));
  add(`column-base-${x}-${y}`, blk(x - 320, y - 320, 0, x + 320, y + 320, 60).color(structuralSteel));
}
add('stand-beam-front', blk(-1700, -1450, Zb - 400, 1700, -1050, Zb).color(structuralSteel));
add('stand-beam-rear', blk(-1700, 1050, Zb - 400, 1700, 1450, Zb).color(structuralSteel));
add('stand-beam-x-a', blk(-1700, -1450, Zb - 400, -1300, 1450, Zb).color(structuralSteel));
add('stand-beam-x-b', blk(1300, -1450, Zb - 400, 1700, 1450, Zb).color(structuralSteel));
add('motor-platform', blk(-4150, -550, Zb - 300, -1700, 1750, Zb).color(structuralSteel));
for (const s of [-1, 1]) add(`stand-brace-${s}`, tube([-1450, s * 1250, 200], [1450, s * 1250, Zb - 400], 70, 4).color(structuralSteel));

// ---- Crusher frame: side plates and front wall ----
const sidePlate = [[-1750, 0], [1500, 0], [1650, 300], [1650, 2500], [1350, 2850], [-700, 2850], [-1750, 2050]].map(([x, z]) => [x, Z(z)]);
add('side-plate-a', sideY(sidePlate, -1150, -950).color(coatedSteel));
add('side-plate-b', sideY(sidePlate, 950, 1150).color(coatedSteel));
for (const s of [-1, 1]) {
  for (const [k, z] of [700, 1500].entries()) add(`side-rib-${s}-${k}`, blk(-1500, s * 1150 - 60, Z(z), 1400, s * 1150 + 60, Z(z + 160)).color(coatedSteel));
}
add('front-wall', blk(1300, -950, Z(300), 1650, 950, Z(2750)).color(coatedSteel));
add('rear-wall', blk(-1750, -950, Z(0), -1550, 950, Z(1800)).color(coatedSteel));
add('frame-foot-a', blk(-1800, -1250, Zb, 1700, -950, Z(180)).color(coatedSteel));
add('frame-foot-b', blk(-1800, 950, Zb, 1700, 1250, Z(180)).color(coatedSteel));

// ---- Fixed jaw and swing jaw (pitman) with ridged liners ----
add('fixed-jaw-liner', sideY([[1300, Z(2700)], [1180, Z(2700)], [1080, Z(300)], [1300, Z(300)]], -900, 900).color(manganeseSteel));
for (let k = 0; k < 6; k++) {
  const u = (k + 0.5) / 6;
  const x = 1180 + (1080 - 1180) * u, z = Z(2700 - 2400 * u);
  add(`fixed-jaw-ridge-${k}`, sideY([[x, z - 120], [x - 60, z], [x, z + 120]], -880, 880).color(manganeseSteel));
}
add('pitman', sideY([[-750, Z(2600)], [-500, Z(2950)], [0, Z(2950)], [150, Z(2600)], [800, Z(450)], [-150, Z(450)]], -900, 900).color(coatedSteel));
add('swing-jaw-liner', sideY([[150, Z(2600)], [260, Z(2600)], [910, Z(470)], [800, Z(450)]], -880, 880).color(manganeseSteel));
for (let k = 0; k < 6; k++) {
  const u = (k + 0.5) / 6;
  const x = 260 + (910 - 260) * u, z = Z(2600 - 2130 * u);
  add(`swing-jaw-ridge-${k}`, sideY([[x, z - 120], [x + 60, z + 10], [x, z + 120]], -860, 860).color(manganeseSteel));
}
// Rock caught in the chamber and spilling over the mouth.
const rocks = [[700, -500, 2700, 260], [620, 250, 2750, 300], [850, 600, 2500, 220], [560, -100, 2350, 200], [880, -650, 2200, 180], [760, 300, 1900, 150]];
rocks.forEach(([x, y, z, r], k) => add(`rock-${k}`, lathe([[r * 0.7, Z(z) - r], [r, Z(z) - r * 0.3], [r * 0.8, Z(z) + r * 0.5], [r * 0.3, Z(z) + r]], 5).rotateZ(k * 37).translate(x, y, 0).color(k % 2 ? rockDark : rock)));

// ---- Eccentric shaft, pillow blocks and flywheels ----
add('eccentric-shaft', latheY([[230, -1950], [230, 1950]], ex, ez, 12).color(manganeseSteel));
for (const s of [-1, 1]) add(`pillow-block-${s}`, blk(ex - 450, s * 1050 - 200, Z(2450), ex + 450, s * 1050 + 200, Z(3050)).color(structuralSteel));
const fr = 1150;
// Spoked flywheel on the -Y end.
{
  const y0 = -1850, y1 = -1500, segs = 20, w = ((2 * Math.PI * fr) / segs) * 1.08;
  for (let i = 0; i < segs; i++) add(`flywheel-rim-${i}`, blk(-w / 2, y0, fr - 200, w / 2, y1, fr).rotateY((360 * i) / segs).translate(ex, 0, ez).color(coatedSteel));
  add('flywheel-hub', latheY([[380, y0 - 50], [380, y1 + 50]], ex, ez, 12).color(coatedSteel));
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 + 0.3;
    add(`flywheel-spoke-${i}`, tube([ex + 350 * Math.cos(a), (y0 + y1) / 2, ez + 350 * Math.sin(a)], [ex + (fr - 180) * Math.cos(a), (y0 + y1) / 2, ez + (fr - 180) * Math.sin(a)], 90, 6).color(coatedSteel));
  }
}
// Grooved drive sheave on the +Y end.
{
  const g = [];
  for (let k = 0; k < 6; k++) g.push([fr - 20, 1500 + k * 70], [fr - 90, 1535 + k * 70]);
  g.push([fr - 20, 1920]);
  add('drive-sheave', latheY(g, ex, ez, 24).color(coatedSteel));
  add('drive-sheave-face', latheY([[fr - 260, 1925], [fr - 260, 1945]], ex, ez, 24).color(dark));
  add('drive-sheave-boss', latheY([[380, 1940], [380, 2050]], ex, ez, 12).color(coatedSteel));
}

// ---- Motor on a pivoting base and V-belts ----
const mx = -3300, mz = Zb + 650, mr = 300;
add('motor-base-plate', blk(mx - 700, -350, Zb, mx + 700, 1500, Zb + 120).color(structuralSteel));
add('motor-base-hinge', latheY([[90, -380], [90, 1530]], mx + 650, Zb + 120, 8).color(structuralSteel));
add('motor', latheY([[440, -300], [480, -200], [480, 1100], [420, 1200]], mx, mz, 16).color(structuralSteel));
for (let y = -100; y < 1050; y += 130) add(`motor-fin-${y}`, latheY([[520, y], [520, y + 40]], mx, mz, 16).color(structuralSteel));
add('motor-terminal-box', blk(mx - 220, 300, mz + 450, mx + 220, 700, mz + 680).color(structuralSteel));
add('motor-fan-cowl', latheY([[400, -420], [440, -300]], mx, mz, 16).color(dark));
add('motor-sheave', latheY([[mr, 1450], [mr, 1950]], mx, mz, 14).color(coatedSteel));
add('belt-tension-screw', tube([mx - 600, 1500, Zb + 120], [mx - 600, 1500, mz + 300], 45, 6).color(manganeseSteel));
{
  const dx = ex - mx, dz = ez - mz, L = Math.hypot(dx, dz);
  const nx = -dz / L, nz = dx / L;
  for (let k = 0; k < 5; k++) {
    const y = 1530 + k * 80;
    for (const s of [-1, 1]) add(`v-belt-${k}-${s}`, tube([mx + s * nx * mr, y, mz + s * nz * mr], [ex + s * nx * (fr - 60), y, ez + s * nz * (fr - 60)], 22, 4).color(rubber));
  }
}

// ---- Rear toggle adjustment and tension rod ----
for (const y of [-500, 500]) {
  add(`toggle-cylinder-${y}`, latheX([[150, -2350], [150, -1750]], y, Z(800), 10).color(structuralSteel));
  add(`toggle-rod-${y}`, latheX([[70, -2550], [70, -2350]], y, Z(800), 8).color(manganeseSteel));
}
add('tension-rod', latheX([[45, -2800], [45, -1750]], 0, Z(450), 8).color(manganeseSteel));
for (let x = -2750; x < -2250; x += 70) add(`tension-spring-${x}`, latheX([[150, x], [150, x + 35]], 0, Z(450), 10).color('#c8442f'));
add('spring-cup', latheX([[180, -2250], [180, -2150]], 0, Z(450), 10).color(structuralSteel));

// ---- Discharge conveyor under the crusher ----
{
  const a = 14, L = 9000, x0 = -1400, z0 = 600;
  const conv = (s) => s.rotateY(-a).translate(x0, 0, z0);
  add('conveyor-stringers', conv(blk(0, -650, -250, L, 650, 0)).color(structuralSteel));
  add('conveyor-belt', conv(blk(0, -550, 0, L, 550, 60)).color(rubber));
  add('conveyor-skirt-a', conv(blk(0, -600, 60, 2800, -520, 400)).color(coatedSteel));
  add('conveyor-skirt-b', conv(blk(0, 520, 60, 2800, 600, 400)).color(coatedSteel));
  add('conveyor-ore', conv(oreRidge(0, L - 300)).color(rock));
  add('conveyor-tail-pulley', conv(latheY([[200, -650], [200, 650]], 0, -100, 10)).color(structuralSteel));
  add('conveyor-head-pulley', conv(latheY([[280, -650], [280, 650]], L, -100, 12)).color(structuralSteel));
  const ca = Math.cos((a * Math.PI) / 180), sa = Math.sin((a * Math.PI) / 180);
  for (const u of [3500, 6500, 8800]) {
    const x = x0 + u * ca, z = z0 + u * sa - 250;
    for (const y of [-600, 600]) add(`conveyor-leg-${u}-${y}`, blk(x - 70, y - 70, 0, x + 70, y + 70, z).color(structuralSteel));
  }
}

return p.model();
