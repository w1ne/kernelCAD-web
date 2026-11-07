// SPDX-License-Identifier: CC0-1.0
// Upright ultra-low-temperature (-80 C) freezer for sample storage.
// What makes it a ULT freezer rather than a plain cabinet: one thick insulated
// outer door with a deep rubber gasket and a tall lever latch, a sloped
// control cowl with a touchscreen above the door, a louvred compressor grille
// across the bottom front, a side access port for probe cables, and the whole
// cabinet riding on a steel base frame with casters.
// Generic visualization geometry at real size (about 870 x 880 mm, 1.99 m
// tall), millimetres, Z up, front facing -Y, standing on z = 0.
meta({
  name: 'ultra-low-temperature-freezer',
  license: 'CC0-1.0',
  title: 'Ultra-low-temperature freezer',
  description: 'Upright -80 C sample freezer: rounded insulated cabinet, single thick outer door with rubber gasket, tall lever latch with lock, sloped control cowl with touchscreen, louvred compressor grille, side access port and hinges on a steel base frame. Material controls: cabinet enamel, latch and trim polymer, gasket rubber, base and grille steel, display glass. Casters or levelling feet; cleanroom and high-visibility presets.',
  tags: ['ult freezer', 'minus 80 freezer', 'sample freezer', 'laboratory freezer', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const mount = param('mount', 'casters', { choices: ['casters', 'feet'], label: 'Base' });
const enamel = param('enamel', '#eef1ee', { label: 'Cabinet and door enamel' });
const polymer = param('polymer', '#2f6fa8', { label: 'Latch, cowl trim and port polymer' });
const rubber = param('rubber', '#30363a', { label: 'Door gasket and caster rubber' });
const stainless = param('stainless', '#9aa6aa', { label: 'Base frame, hinges and grille steel' });
const display = param('display', '#18242c', { label: 'Touchscreen glass' });
presets({
  cleanroom: { enamel: '#f6f8f6', polymer: '#23a5a2', rubber: '#484f52', stainless: '#d0d9d8', display: '#20343a' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffd000', rubber: '#202528', stainless: '#6f8488', display: '#0f1a20' },
});

const p = assembly('ultra-low-temperature-freezer');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Solid from an (x, z) front profile, `t` thick from y = 0 towards -Y.
const frontProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90);
// Solid from a (y, z) side profile, `t` thick and centred on x = 0.
const sideProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Rounded rectangle centred on the origin.
const roundRect = (w, h, r, n = 3) => {
  const pts = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i += 1) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};

const W = 870;
const D = 880;
const Z0 = mount.value === 'casters' ? 130 : 70;
const TOP = 1990;
const FRONT = -D / 2;

// Base frame and running gear.
add('base-frame', box(W - 40, D - 60, Z0 - 60, true).translate(0, 0, (Z0 + 60) / 2).color(stainless));
for (const [i, [x, y]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
  const cx = x * (W / 2 - 80);
  const cy = y * (D / 2 - 90);
  if (mount.value === 'casters') {
    add(`caster-fork-${i}`, box(56, 70, 60, true).translate(cx, cy, 90).color(stainless));
    add(`caster-wheel-${i}`, turned([[0, -18], [42, -18], [50, 0], [42, 18], [0, 18]]).rotateY(90).translate(cx, cy, 50).color(rubber));
  } else {
    add(`levelling-foot-${i}`, turned([[0, 0], [45, 0], [45, 14], [14, 24], [14, 60], [0, 60]]).translate(cx, cy, 0).color(rubber));
  }
}

// Insulated cabinet with rounded vertical corners.
add('insulated-cabinet', extrudePolygon(roundRect(W, D, 45), TOP - 170 - Z0).translate(0, 0, Z0).color(enamel));
// Sloped control cowl across the top front, with the touchscreen on its face.
add('control-cowl', sideProfile([[FRONT + 30, TOP - 170], [FRONT - 25, TOP - 150], [FRONT + 10, TOP], [D / 2 - 40, TOP], [D / 2 - 40, TOP - 170]], W - 20).color(enamel));
add('cowl-trim', sideProfile([[FRONT - 25, TOP - 158], [FRONT - 33, TOP - 152], [FRONT + 2, TOP + 6], [FRONT + 10, TOP]], W - 20).color(polymer));
add('touchscreen', sideProfile([[FRONT - 22, TOP - 125], [FRONT - 28, TOP - 122], [FRONT - 4, TOP - 35], [FRONT + 2, TOP - 38]], 230).translate(160, 0, 0).color(display));
add('status-lamp', box(60, 10, 14, true).rotateX(-20).translate(-250, FRONT - 15, TOP - 85).color(polymer));

// Thick outer door, gasket behind it, hinges on the left.
const DOOR_W = W - 50;
const DOOR_B = Z0 + 260;
const DOOR_T = TOP - 185;
const doorFace = roundRect(DOOR_W, DOOR_T - DOOR_B, 30).map(([x, z]) => [x, z + (DOOR_T + DOOR_B) / 2]);
add('door-gasket', frontProfile(roundRect(DOOR_W - 16, DOOR_T - DOOR_B - 16, 24).map(([x, z]) => [x, z + (DOOR_T + DOOR_B) / 2]), 22).translate(0, FRONT, 0).color(rubber));
add('outer-door', frontProfile(doorFace, 70).translate(0, FRONT - 22, 0).color(enamel));
for (const z of [DOOR_B + 160, DOOR_T - 160]) {
  add(`hinge-${z}`, turned([[0, 0], [22, 0], [22, 150], [0, 150]]).translate(-W / 2 + 12, FRONT - 40, z - 75).color(stainless));
}

// Tall lever latch on the right edge with a lock barrel.
const DY = FRONT - 92;
add('latch-lever', sideProfile([
  [DY, 900], [DY - 60, 930], [DY - 70, 1000], [DY - 70, 1380], [DY - 55, 1430], [DY, 1450],
  [DY, 1410], [DY - 32, 1395], [DY - 38, 1360], [DY - 38, 1010], [DY - 32, 965], [DY, 945],
], 54).translate(DOOR_W / 2 - 60, 0, Z0 - 130).color(polymer));
add('latch-base', box(80, 14, 640, true).translate(DOOR_W / 2 - 60, DY + 7, 1175 + Z0 - 130).color(stainless));
add('lock-barrel', turned([[0, 0], [17, 0], [17, 22], [12, 26], [0, 26]]).rotateX(90).translate(DOOR_W / 2 - 60, DY - 6, 1520 + Z0 - 130).color(stainless));

// Louvred compressor grille below the door.
add('grille-frame', box(W - 80, 16, 220, true).translate(0, FRONT - 6, Z0 + 125).color(stainless));
for (let i = 0; i < 6; i += 1) {
  add(`grille-louvre-${i}`, box(W - 120, 8, 30, true).rotateX(35).translate(0, FRONT - 18, Z0 + 40 + i * 34).color(rubber));
}

// Side access port for probes and alarm cables.
add('access-port', turned([[0, 0], [70, 0], [70, 18], [55, 18], [55, 55], [0, 55]]).rotateY(-90).translate(-W / 2, 120, 1450).color(polymer));
add('port-plug', turned([[0, 0], [52, 0], [44, 18], [0, 18]]).rotateY(-90).translate(-W / 2 - 55, 120, 1450).color(rubber));

return p.model();
