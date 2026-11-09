// SPDX-License-Identifier: CC0-1.0
// Mine skip, the tall steel bucket that hoists broken ore up a vertical
// shaft. What makes it one: a deep open-topped vessel with a floor sloping to
// a bottom-dump door, hung inside a bridle of side stiles, crosshead and
// transom, guided up the shaft by shoes and rollers running on fixed steel
// guides tied back to buntons, and lifted by the head rope through a cappel
// socket on the crosshead. Wear liners line the rim; the door swings open at
// the dump station to discharge ore.
// Millimetres, Z up, guides on +/-X, dump door on the -Y (front) side, ground
// origin at the centre of the shaft station floor.
meta({
  name: "mine-skip",
  license: 'CC0-1.0',
  title: "Mine skip conveyance",
  description: "Bottom-dump shaft skip at about real size: 7 m open-topped vessel with stiffening bands and a floor sloping to a hinged front dump door with cam roller, manganese wear liners on the rim, bridle with side stiles, crosshead and transom, guide shoes and rollers on two steel shaft guides tied to buntons, cappel socket and head rope, landing keps on a concrete station floor. Material controls: skip body coating, bridle and guide steel, manganese wear liners, ore, plus a gate choice (loaded with the door shut, or dumping with the door open and ore pouring onto a pile). weathered, highVisibility and blueHoist presets.",
  tags: ['mining', 'shaft hoisting', 'mine skip', 'hoist conveyance', 'headframe', 'ore handling', 'underground mining', 'shaft'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#c9a227', { label: 'Skip body coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Bridle and guide steel' });
const manganeseSteel = param('manganeseSteel', '#8a8f8c', { label: 'Manganese wear liners' });
const ore = param('ore', '#8c7c6a', { label: 'Ore' });
const gate = param('gate', 'loaded', { choices: ['loaded', 'dumping'], label: 'Skip state' });
presets({
  weathered: { coatedSteel: '#8a7a55', structuralSteel: '#666a66', manganeseSteel: '#77706a', ore: '#7d7062' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', manganeseSteel: '#9aa09c', ore: '#a99b88' },
  blueHoist: { coatedSteel: '#2f6f9e', structuralSteel: '#3b4248', manganeseSteel: '#b5bab6', ore: '#6f4a3a' },
});

const p = assembly("mine-skip");
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
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// (y, z) outline extruded along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const dark = '#26292b', concrete = '#a6a196', guard = '#e8c21a', rope = '#3a3c3d';
const dumping = gate.value === 'dumping';
const HX = 900, HY = 750; // vessel half-widths
const Zf = 1500, Zr = 2300, Zt = 8500; // floor front, floor rear, rim

add('station-floor', blk(-2600, -3800, 0, 2600, 1600, 300).color(concrete));
add('floor-edge-stripe', blk(-2600, -3800, 300, 2600, -3650, 330).color(guard));

// ---- Vessel: sloped floor, open top, front dump opening ----
const outer = [[-HY, Zf], [HY, Zr], [HY, Zt], [-HY, Zt]];
const inner = [[-HY + 70, Zf + 100], [HY - 70, Zr + 80], [HY - 70, Zt + 100], [-HY + 70, Zt + 100]];
add('vessel', profileYZ(outer, 2 * HX).subtract(profileYZ(inner, 2 * HX - 140)).subtract(blk(-HX + 120, -HY - 50, Zf + 60, HX - 120, -HY + 40, Zf + 1150)).color(coatedSteel));
for (const z of [3300, 4700, 6100, 7500]) add(`stiffening-band-${z}`, blk(-HX - 40, -HY - 40, z, HX + 40, HY + 40, z + 140).subtract(blk(-HX + 10, -HY + 10, z - 10, HX - 10, HY - 10, z + 150)).color(structuralSteel));
add('rim-liner', blk(-HX - 50, -HY - 50, Zt - 250, HX + 50, HY + 50, Zt + 60).subtract(blk(-HX + 40, -HY + 40, Zt - 260, HX - 40, HY - 40, Zt + 70)).color(manganeseSteel));
add('door-sill', blk(-HX + 80, -HY - 60, Zf - 60, HX - 80, -HY + 60, Zf + 60).color(manganeseSteel));

// Dump door hinged on its top edge; cam roller on an arm at the side.
const hz = Zf + 1180, hy = -HY - 40;
const door = (s) => (dumping ? s.rotateX(-55) : s).translate(0, hy, hz);
add('dump-door', door(blk(-HX + 100, -30, -1200, HX - 100, 30, 0)).color(coatedSteel));
add('door-ribs', door(blk(-HX + 160, -70, -1000, HX - 160, -30, -880)).color(structuralSteel));
add('door-hinge', rod(70, -HX + 60, HX - 60, 10).rotateY(90).translate(0, hy, hz).color(structuralSteel));
add('cam-arm', door(blk(HX - 100, -60, -1150, HX + 80, 0, -700)).color(structuralSteel));
add('cam-roller', door(rod(150, HX + 80, HX + 200, 12).rotateY(90).translate(0, -150, -900)).color(dark));

if (dumping) {
  // Ore pouring off the open door onto a pile in front of the station.
  add('ore-stream', tube([0, -HY - 200, Zf + 300], [0, -2500, 900], 420, 6).color(ore));
  add('ore-pile', lathe([[1500, 300], [250, 1300]], 12).translate(0, -2700, 0).color(ore));
  for (const [i, [x, y, r]] of [[-900, -2200, 220], [800, -3100, 260], [1200, -2300, 200]].entries()) add(`ore-lump-${i}`, sphere(r).translate(x, y, 300 + r * 0.5).color(ore));
} else {
  // Loaded: ore heaped above the rim.
  add('ore-load', lathe([[900, Zt - 150], [180, Zt + 450]], 10).scale([1, 0.8, 1]).color(ore));
  for (const [i, [x, y, r]] of [[-420, -260, 230], [380, 200, 260], [260, -330, 200]].entries()) add(`ore-lump-${i}`, sphere(r).translate(x, y, Zt + 100).color(ore));
}

// ---- Bridle: stiles, crosshead, transom ----
for (const s of [-1, 1]) {
  const t = s < 0 ? 'l' : 'r';
  add(`stile-${t}`, blk(s * HX, -220, 1000, s * (HX + 160), 220, 10600).color(structuralSteel));
  add(`stile-stay-${t}`, tube([s * (HX + 80), -180, 9600], [s * 300, -180, 10600], 50, 6).color(structuralSteel));
  add(`stile-stay-rear-${t}`, tube([s * (HX + 80), 180, 9600], [s * 300, 180, 10600], 50, 6).color(structuralSteel));
}
add('crosshead', blk(-HX - 160, -280, 10600, HX + 160, 280, 11050).color(structuralSteel));
add('transom', blk(-HX - 160, -280, 1000, HX + 160, 280, 1400).color(structuralSteel));

// ---- Head rope through a cappel socket ----
for (const x of [-220, 220]) add(`suspension-link-${x < 0 ? 'l' : 'r'}`, tube([x, 0, 11050], [0, 0, 11700], 55, 6).color(manganeseSteel));
add('cappel', lathe([[150, 11650], [210, 11900], [190, 12300], [90, 12600]], 10).color(guard));
add('head-rope', rod(36, 12600, 16000, 8).color(rope));

// ---- Shaft guides, buntons, guide shoes and rollers ----
const GX = HX + 360;
for (const s of [-1, 1]) {
  const t = s < 0 ? 'l' : 'r';
  add(`guide-${t}`, blk(s * (GX - 90), -90, 300, s * (GX + 90), 90, 16000).color(structuralSteel));
  for (const z of [1200, 10200]) {
    add(`guide-shoe-${t}-${z}`, blk(s * (HX + 160), -150, z, s * (GX - 90), 150, z + 600).color(dark));
    for (const y of [-1, 1]) add(`guide-roller-${t}-${z}-${y < 0 ? 'f' : 'b'}`, rod(170, -60, 60, 12).rotateY(90).translate(s * GX, y * 270, z + 300).color(guard));
  }
  for (const z of [3500, 7500, 11500, 15000]) add(`bunton-bracket-${t}-${z}`, blk(s * (GX - 80), 90, z, s * (GX + 80), 1100, z + 240).color(structuralSteel));
}
for (const z of [3500, 7500, 11500, 15000]) add(`bunton-${z}`, blk(-GX - 200, 1100, z, GX + 200, 1300, z + 300).color(structuralSteel));

// ---- Landing keps under the transom ----
for (const x of [-650, 650]) add(`landing-kep-${x < 0 ? 'l' : 'r'}`, blk(x - 140, -320, 300, x + 140, 320, 1000).color(guard));

return p.model();
