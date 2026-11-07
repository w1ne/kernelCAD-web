// SPDX-License-Identifier: CC0-1.0
// Ventilated two-cylinder gas cabinet for toxic or flammable process gases.
// What makes it a gas cabinet rather than a locker: a heavy steel enclosure
// with a self-closing door carrying a wired-glass view window and a louvred
// make-up air intake, two tall gas cylinders inside held by restraint
// straps, a stainless purge panel with regulators and gauges piped to the
// cylinder valves by pigtails, a round exhaust duct collar and sprinkler head
// on the roof, and a hazard placard on the door. Generic visualization
// geometry at real size (2.0 m tall), millimetres, Z up, door on the -Y side
// hinged on the left, feet on z = 0.
meta({
  name: 'laboratory-gas-cylinder-cabinet',
  license: 'CC0-1.0',
  title: 'Laboratory gas-cylinder cabinet',
  description: 'Ventilated two-cylinder gas cabinet: steel enclosure, self-closing door with wired-glass view window, louvred air intake and hazard placard, two restrained gas cylinders with valves, stainless purge panel with regulators, gauges and pigtails, round exhaust collar and sprinkler head. Material controls: cabinet enamel, cylinder paint, window glass, stainless panel, polymer handle and placard. Door closed or open; cleanroom, high-visibility and oxygen-service presets.',
  tags: ['gas cabinet', 'gas cylinder', 'compressed gas', 'purge panel', 'regulator', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 3000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const door = param('door', 'open', { choices: ['closed', 'open'], label: 'Door' });
const enamel = param('enamel', '#c9dedc', { label: 'Cabinet enamel' });
const cylinder = param('cylinder', '#4f6b3a', { label: 'Gas cylinder paint' });
const glass = param('glass', '#55b7ca', { label: 'Wired-glass view window' });
const stainless = param('stainless', '#b8c7ca', { label: 'Purge panel, valves and duct stainless' });
const polymer = param('polymer', '#e5a331', { label: 'Handle, straps and hazard placard' });
presets({
  cleanroom: { enamel: '#e7f0ed', cylinder: '#6d7f86', glass: '#8bd4dc', stainless: '#d0d9d8', polymer: '#23a5a2' },
  highVisibility: { enamel: '#f2d200', cylinder: '#b2302a', glass: '#44d3e2', stainless: '#6f8488', polymer: '#1f2a30' },
  oxygenService: { enamel: '#d9dcd6', cylinder: '#eef0ec', glass: '#7fc4d0', stainless: '#a9b3b5', polymer: '#2f6fa8' },
});

const p = assembly('laboratory-gas-cylinder-cabinet');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Round bar from p0 to p1.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const W = 900;
const D = 460;
const H = 2000;
const FRONT = -D / 2;
const T = 20;
const FLOOR = 80;

// Enclosure built from panels so the interior shows when the door is open.
for (const [i, [x, y]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
  add(`foot-${i}`, turned([[0, 0], [30, 0], [30, 10], [12, 20], [12, 60], [0, 60]]).translate(x * (W / 2 - 60), y * (D / 2 - 60), 0).color(stainless));
}
add('floor-pan', box(W, D, 30, true).translate(0, 0, FLOOR - 15).color(enamel));
add('back-panel', box(W, T, H - FLOOR, true).translate(0, D / 2 - T / 2, (H + FLOOR) / 2).color(enamel));
for (const s of [-1, 1]) add(`side-panel-${s}`, box(T, D, H - FLOOR, true).translate(s * (W / 2 - T / 2), 0, (H + FLOOR) / 2).color(enamel));
add('roof-panel', box(W, D, T, true).translate(0, 0, H - T / 2).color(enamel));
add('door-header', box(W, 40, 60, true).translate(0, FRONT + 20, H - 50).color(enamel));
add('door-sill', box(W, 40, 50, true).translate(0, FRONT + 20, FLOOR + 25).color(enamel));

// Two gas cylinders with shoulders, valves and restraint straps.
const CY = 40;
const CR = 115;
for (const [i, x] of [-210, 210].entries()) {
  add(`cylinder-${i}`, turned([[0, 0], [CR - 8, 0], [CR, 12], [CR, 1180], [CR - 25, 1260], [55, 1310], [30, 1330], [0, 1330]]).translate(x, CY, FLOOR).color(cylinder));
  add(`cylinder-neck-${i}`, turned([[0, 0], [28, 0], [28, 40], [0, 40]]).translate(x, CY, FLOOR + 1330).color(stainless));
  add(`cylinder-valve-${i}`, box(44, 44, 70, true).translate(x, CY, FLOOR + 1405).color(stainless));
  add(`valve-handwheel-${i}`, turned([[0, 0], [38, 0], [38, 10], [0, 10]]).translate(x, CY, FLOOR + 1445).color(polymer));
  add(`valve-outlet-${i}`, rod([x, CY - 22, FLOOR + 1400], [x, CY - 60, FLOOR + 1400], 10, 8).color(stainless));
  for (const z of [700, 1150]) {
    add(`strap-${i}-${z}`, turned([[CR + 2, 0], [CR + 10, 0], [CR + 10, 45], [CR + 2, 45]]).translate(x, CY, FLOOR + z).color(polymer));
  }
}
for (const z of [700, 1150]) add(`strap-rail-${z}`, box(W - 2 * T, 24, 50, true).translate(0, D / 2 - T - 12, FLOOR + z + 22).color(stainless));

// Stainless purge panel on the back wall: regulators, gauges and pigtails.
const PZ = FLOOR + 1560;
const PY = D / 2 - T - 8;
add('purge-panel', box(W - 120, 16, 300, true).translate(0, PY, PZ).color(stainless));
for (const [i, x] of [-210, 210].entries()) {
  add(`regulator-${i}`, turned([[0, 0], [42, 0], [42, 50], [30, 70], [0, 70]]).rotateX(90).translate(x, PY - 8, PZ - 40).color(stainless));
  add(`regulator-knob-${i}`, turned([[0, 0], [22, 0], [22, 30], [0, 30]]).rotateX(90).translate(x, PY - 78, PZ - 40).color(polymer));
  for (const dx of [-75, 75]) {
    add(`gauge-${i}-${dx}`, turned([[0, 0], [36, 0], [36, 22], [0, 22]]).rotateX(90).translate(x + dx, PY - 8, PZ + 70).color(stainless));
    add(`gauge-face-${i}-${dx}`, turned([[0, 0], [30, 0], [30, 2], [0, 2]]).rotateX(90).translate(x + dx, PY - 30, PZ + 70).color(enamel));
  }
  add(`pigtail-down-${i}`, rod([x, CY - 60, FLOOR + 1400], [x, PY - 40, PZ - 120], 7, 6).color(stainless));
  add(`pigtail-up-${i}`, rod([x, PY - 40, PZ - 120], [x, PY - 40, PZ - 40], 7, 6).color(stainless));
}
add('process-line', rod([-(W / 2 - T), PY - 30, PZ + 110], [W / 2 - T, PY - 30, PZ + 110], 9, 8).color(stainless));

// Self-closing door, built about its left hinge then swung if open.
const DW = W - 20;
const DZ0 = FLOOR + 50;
const DZ1 = H - 80;
const HX = -W / 2 + 10;
const swing = (s) => s.rotateZ(door.value === 'open' ? -105 : 0).translate(HX, FRONT, 0);
const DT = 28;
// Door leaf with a cut-out for the view window.
const WX0 = DW / 2 - 170;
const WX1 = DW / 2 + 170;
const WZ0 = 1250;
const WZ1 = 1620;
add('door-leaf-left', swing(box(WX0, DT, DZ1 - DZ0, true).translate(WX0 / 2, -DT / 2, (DZ0 + DZ1) / 2)).color(enamel));
add('door-leaf-right', swing(box(DW - WX1, DT, DZ1 - DZ0, true).translate((DW + WX1) / 2, -DT / 2, (DZ0 + DZ1) / 2)).color(enamel));
add('door-leaf-below', swing(box(WX1 - WX0, DT, WZ0 - DZ0, true).translate(DW / 2, -DT / 2, (DZ0 + WZ0) / 2)).color(enamel));
add('door-leaf-above', swing(box(WX1 - WX0, DT, DZ1 - WZ1, true).translate(DW / 2, -DT / 2, (WZ1 + DZ1) / 2)).color(enamel));
add('view-window', swing(box(WX1 - WX0, 8, WZ1 - WZ0, true).translate(DW / 2, -DT / 2, (WZ0 + WZ1) / 2)).color(glass));
for (const [n, w, h, x, z] of [['bottom', 390, 25, DW / 2, WZ0 - 12], ['top', 390, 25, DW / 2, WZ1 + 12], ['left', 25, 390, WX0 - 12, (WZ0 + WZ1) / 2], ['right', 25, 390, WX1 + 12, (WZ0 + WZ1) / 2]]) {
  add(`window-frame-${n}`, swing(box(w, 8, h, true).translate(x, -DT - 4, z)).color(stainless));
}
// Louvred make-up air intake low on the door.
add('intake-frame', swing(box(520, 8, 260, true).translate(DW / 2, -DT - 4, DZ0 + 220)).color(stainless));
for (let i = 0; i < 6; i += 1) {
  add(`intake-louvre-${i}`, swing(box(490, 8, 34, true).rotateX(35).translate(DW / 2, -DT - 14, DZ0 + 120 + i * 40)).color(enamel));
}
// Lever handle with escutcheon, hinges and hazard placard.
add('handle-escutcheon', swing(box(50, 12, 200, true).translate(DW - 70, -DT - 6, 1080)).color(stainless));
add('handle-lever', swing(rod([DW - 70, -DT - 40, 1130], [DW - 230, -DT - 40, 1130], 13, 8)).color(polymer));
add('handle-boss', swing(rod([DW - 70, -DT - 12, 1130], [DW - 70, -DT - 40, 1130], 18, 10)).color(stainless));
add('hazard-placard', swing(box(200, 4, 200, true).rotateY(45).translate(DW / 2, -DT - 2, 1820)).color(polymer));
for (const z of [DZ0 + 200, (DZ0 + DZ1) / 2, DZ1 - 200]) {
  add(`hinge-${z}`, rod([-4, -14, z - 70], [-4, -14, z + 70], 14, 8).translate(HX, FRONT, 0).color(stainless));
}

// Round exhaust collar with a damper quadrant, and a sprinkler head.
add('exhaust-collar', turned([[0, 0], [100, 0], [100, 12], [80, 12], [80, 200], [0, 200]]).translate(-150, 40, H).color(stainless));
add('collar-throat', turned([[0, 200], [70, 200], [70, 203], [0, 203]]).translate(-150, 40, H).color(cylinder));
add('damper-quadrant', box(70, 10, 50, true).translate(-150, -45, H + 120).color(polymer));
add('sprinkler-body', turned([[0, 0], [22, 0], [22, 30], [14, 40], [14, 70], [0, 70]]).translate(220, 40, H).color(stainless));
add('sprinkler-deflector', turned([[0, 70], [34, 70], [34, 76], [0, 76]]).translate(220, 40, H).color(polymer));

return p.model();
