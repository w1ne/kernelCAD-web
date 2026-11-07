// SPDX-License-Identifier: CC0-1.0
// Round point shovel, the digging and backfilling shovel of every trench.
// What makes it one: a pointed, rounded blade dished across its width and
// set at a lift angle to the shaft; turned-over foot steps on its shoulders;
// a pressed centre rib running up into a riveted tubular socket; a long ash
// shaft with a split-wood D-grip and a rubber cross grip; soil on the tip.
// Millimetres, Z up, blade tip on z = 0, shaft axis on the origin.
meta({
  name: "round-point-shovel",
  license: 'CC0-1.0',
  title: "Round point shovel",
  description: "Full-size round point digging shovel: pointed rounded blade dished across its width and set at a 15 degree lift, turned-over foot steps, pressed centre rib, riveted tubular socket, ash shaft with ferrule, split D-grip tines and rubber cross grip, and soil on the tip. Material controls: timber, painted blade steel, rubber, soil; fieldReady, weathered and bareSteel presets.",
  tags: ["archaeology", "excavation", "fieldwork", "shovel", "round point shovel", "digging", "hand tool", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#b48a5a', { label: 'Timber' });
const bladeSteel = param('bladeSteel', '#b23a2e', { label: 'Painted blade steel' });
const rubber = param('rubber', '#2b2f31', { label: 'Rubber' });
const soil = param('soil', '#6b5038', { label: 'Soil' });
presets({
  fieldReady: { timber: '#c49866', bladeSteel: '#c8402f', rubber: '#3a3f41', soil: '#6f5640' },
  weathered: { timber: '#7f6448', bladeSteel: '#7d4a33', rubber: '#292f30', soil: '#5b4a3a' },
  bareSteel: { timber: '#a27850', bladeSteel: '#8f999e', rubber: '#24282a', soil: '#7a5f45' },
});

const p = assembly("round-point-shovel");
const LIFT = 15, PIV = 370, DISH = 9;
const rad = (d) => (d * Math.PI) / 180;
// Dropped so the blade tip (raised by the lift angle about the socket) sits on z = 0.
const DROP = PIV * (1 - Math.cos(rad(LIFT))) - 1.5 * Math.cos(rad(DISH)) * Math.sin(rad(LIFT));
const add = (name, shape) => p.part(name, shape.translate(0, 0, -DROP).scale(scale));

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
// Lathe along X / Y: [[radius, x or y], ...] rising, centred on the other two axes.
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
const outline = (pts) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close();
};
// Closed (x, z) profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => outline(pts).extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

// Blade parts are drawn flat in the XZ plane, then tilted about the socket.
const lifted = (s) => s.translate(0, 0, -PIV).rotateX(-LIFT).translate(0, 0, PIV);
const half = [[0, 0], [40, 8], [75, 30], [100, 65], [114, 110], [119, 180], [119, 300], [30, 300], [20, 372], [0, 372]];
add('blade-right', lifted(sideY(half, -1.5, 1.5).rotateZ(DISH)).color(bladeSteel));
add('blade-left', lifted(sideY(half.map(([x, z]) => [-x, z]).reverse(), -1.5, 1.5).rotateZ(-DISH)).color(bladeSteel));
add('centre-rib', lifted(sideY([[-7, 120], [7, 120], [10, 372], [-10, 372]], -6, -1)).color(bladeSteel));
for (const s of [-1, 1]) {
  // Turned-over foot step along the top of each shoulder.
  add(`foot-step-${s}`, lifted((s > 0 ? blk(28, -1, 296, 119, 22, 302) : blk(-119, -1, 296, -28, 22, 302)).rotateZ(s * DISH)).color(bladeSteel));
  add(`soil-smear-${s}`, lifted(sideY([[0, 2], [s * 38, 10], [s * 70, 32], [s * 55, 70], [s * 12, 58]], -4.5, -1).rotateZ(s * DISH)).color(soil));
}
add('soil-tip-clod', lifted(blk(-30, -14, 4, 30, -2, 40)).color(soil));

// ---- Socket and shaft ----
add('socket', lathe([[24, 330], [22, 372], [20, 560], [19, 580]], 12).color(bladeSteel));
add('socket-seam', blk(-3, -23, 380, 3, -19, 560).color(bladeSteel));
for (const z of [430, 520]) add(`rivet-${z}`, latheY([[5, 18], [4, 25]], 0, z, 8).color('#9aa2a5'));
add('shaft', lathe([[18, 560], [19, 700], [18, 1200], [17, 1390]], 12).color(timber));
add('ferrule', lathe([[20, 1360], [20, 1400]], 12).color(bladeSteel));
// D-grip: the shaft splits into two tines that meet a cross grip.
for (const s of [-1, 1]) {
  add(`d-tine-${s}`, tube([s * 6, 0, 1395], [s * 58, 0, 1470], 13, 8).color(timber));
  add(`d-tine-top-${s}`, tube([s * 58, 0, 1470], [s * 60, 0, 1545], 12, 8).color(timber));
  add(`grip-rivet-${s}`, latheY([[5, -16], [5, 16]], s * 60, 1545, 8).color('#9aa2a5'));
}
add('cross-grip', latheX([[18, -74], [21, -60], [21, 60], [18, 74]], 0, 1550, 12).color(rubber));

return p.model();
