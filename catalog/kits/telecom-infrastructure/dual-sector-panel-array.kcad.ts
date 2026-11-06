// SPDX-License-Identifier: CC0-1.0
// Dual sector panel array: two cellular sector antennas on a T-frame head,
// as found on a rooftop pole or the face of a tower carrying two operators
// or two bands.
// What makes it a sector array rather than two slabs: a centre pole with
// twin galvanized crossbars clamped to it, a short mounting pipe at each end,
// and on each pipe a tall D-section radome with moulded end caps, tilt
// brackets, bottom connectors and black jumpers looping back to the pole.
// The two panels splay outwards to cover adjacent sectors or face the same
// way side by side.
// Generic visualization geometry at real size (panels 1.4 m x 300 mm, head
// frame 1.1 m wide, pole 2.6 m), millimetres, Z up, panels facing -Y,
// ground on z = 0.

meta({
  name: "dual-sector-panel-array",
  license: 'CC0-1.0',
  title: "Dual sector panel array",
  description: "Two cellular sector panel antennas on a T-frame head: centre pole on a gusseted base plate, twin crossbars clamped with U-bolts, a mounting pipe at each end carrying a 1.4 m D-section radome with end caps, tilt brackets, bottom connectors and jumper cables back down the pole; panels splayed 30 degrees or side by side. Material controls: radomes, end caps and brackets, galvanized frame, stainless clamps, connectors and jumpers. Field-site and high-visibility presets.",
  tags: ['sector antenna', 'panel antenna', 'antenna array', 'cellular', '4G', '5G', 'base station', 'rooftop', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const azimuth = param('azimuth', 'splayed', { choices: ['splayed', 'parallel'], label: 'Panel azimuth' });

const radome = param('radome', '#d6dadb', { label: 'Radomes (UV-stable polymer)' });
const powderCoat = param('powderCoat', '#318b96', { label: 'End caps and tilt brackets (powder-coated)' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Pole, crossbars and pipes (galvanized steel)' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Clamp collars and U-bolts (stainless steel)' });
const polymer = param('polymer', '#22292d', { label: 'Connectors and jumper cables (black polymer)' });
presets({
  fieldSite: {
    radome: '#c4c9c3',
    powderCoat: '#52756b',
    galvanizedSteel: '#8f9b9b',
    stainlessSteel: '#d0d9d6',
    polymer: '#263a37',
  },
  highVisibility: {
    radome: '#eef0ee',
    powderCoat: '#e0aa18',
    galvanizedSteel: '#3a4b51',
    stainlessSteel: '#e4e9e6',
    polymer: '#27363c',
  },
});

const p = assembly("dual-sector-panel-array");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turn a +Z-pointing shape to point along `d`, then move it to `at`.
const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Radome cross-section: flat back at +Y, rounded front at -Y, grown by `g`.
const section = (g) => [
  [-150 - g, 70 + g], [-150 - g, -25], [-132 - g, -52 - g * 0.6], [-92, -67 - g], [-30, -72 - g],
  [30, -72 - g], [92, -67 - g], [132 + g, -52 - g * 0.6], [150 + g, -25], [150 + g, 70 + g],
];

const L = 1400; // panel length
const PZ = 800; // panel bottom height
const MY = 330; // centre pole axis
const PX = 430; // mounting pipes, either side of the pole
const PY = MY - 120;
const BAR = [PZ + 150, PZ + L - 150]; // crossbar heights
const AZ = azimuth.value === 'splayed' ? 30 : 0;

// Centre pole and base plate.
add('pole', turned([[0, 0], [45, 0], [45, 2600], [0, 2600]]).translate(0, MY, 0).color(galvanizedSteel));
add('pole-cap', turned([[0, 0], [49, 0], [49, 10], [28, 24], [0, 24]]).translate(0, MY, 2600).color(galvanizedSteel));
add('base-plate', box(480, 480, 18, true).translate(0, MY, 9).color(galvanizedSteel));
for (let i = 0; i < 4; i += 1) {
  add(`gusset-${i}`, extrudePolygon([[45, 0], [195, 0], [45, 180]], 12)
    .rotateX(90).translate(0, 6, 18).rotateZ(45 + i * 90).translate(0, MY, 0).color(galvanizedSteel));
}

// Head frame: two crossbars in front of the pole, each held by a back plate
// and U-bolts, and a short vertical pipe at each end.
for (const z of BAR) {
  add(`crossbar-${z}`, box(2 * PX + 120, 60, 60, true).translate(0, MY - 75, z).color(galvanizedSteel));
  add(`pole-clamp-${z}`, turned([[45, -50], [58, -50], [58, 50], [45, 50]]).translate(0, MY, z).color(stainlessSteel));
  for (const s of [-1, 1]) {
    add(`pipe-clamp-${z}-${s}`, box(90, 50, 90, true).translate(s * PX, PY + 15, z).color(stainlessSteel));
  }
}
for (const s of [-1, 1]) {
  add(`mount-pipe-${s}`, turned([[0, 0], [30, 0], [30, L + 300], [0, L + 300]]).translate(s * PX, PY, PZ - 150).color(galvanizedSteel));
  add(`mount-pipe-cap-${s}`, turned([[0, 0], [33, 0], [33, 8], [18, 18], [0, 18]]).translate(s * PX, PY, PZ + L + 150).color(polymer));
}

// Each panel is authored like a single sector antenna (bottom at z = 0,
// back at +Y, its pipe at y = 210), then turned about its pipe and placed.
for (const s of [-1, 1]) {
  const az = s * AZ;
  const place = (shape) => shape.translate(0, -210, 0).rotateZ(az).translate(s * PX, PY, PZ);
  const at = ([x, y, z]) => {
    const a = (az * Math.PI) / 180;
    const yy = y - 210;
    return [x * Math.cos(a) - yy * Math.sin(a) + s * PX, x * Math.sin(a) + yy * Math.cos(a) + PY, z + PZ];
  };
  const tag = s < 0 ? 'left' : 'right';
  add(`radome-${tag}`, place(extrudePolygon(section(0), L - 60).translate(0, 0, 30)).color(radome));
  add(`bottom-cap-${tag}`, place(extrudePolygon(section(5), 30)).color(powderCoat));
  add(`top-cap-${tag}`, place(extrudePolygon(section(5), 30).translate(0, 0, L - 30)).color(powderCoat));
  add(`spine-${tag}`, place(box(120, 14, L - 120, true).translate(0, 82, L / 2)).color(powderCoat));
  for (const zb of [150, L - 150]) {
    add(`bracket-${tag}-${zb}`, place(box(150, 12, 90, true).translate(0, 95, zb)).color(powderCoat));
    for (const x of [-50, 50]) {
      add(`arm-${tag}-${zb}-${x}`, place(box(18, 90, 18, true).translate(x * 0.7, 145, zb)).color(powderCoat));
    }
    add(`pipe-collar-${tag}-${zb}`, turned([[28, -40], [42, -40], [42, 40], [28, 40]]).translate(s * PX, PY, PZ + zb).color(stainlessSteel));
  }
  // Two connectors per panel, with jumpers back along the crossbar and
  // down the pole.
  for (const [i, x] of [-60, 60].entries()) {
    add(`connector-${tag}-${i}`, place(turned([[0, 0], [16, 0], [16, 18], [11, 22], [11, 48], [0, 48]]).rotateX(180).translate(x, 10, 0)).color(polymer));
    const a = at([x, 10, -48]);
    const b = [s * (PX - 60 - i * 40), PY - 40, PZ - 160];
    const c = [s * (70 + i * 18), MY - 54, PZ - 260];
    const d = [s * (70 + i * 18), MY - 54, 90];
    const e = [s * (110 + i * 18), MY - 160, 20];
    for (const [j, [u, v]] of [[a, b], [b, c], [c, d], [d, e]].entries()) {
      add(`jumper-${tag}-${i}-${j}`, rod(u, v, 7, 5).color(polymer));
    }
  }
}

return p.model();
