// SPDX-License-Identifier: CC0-1.0
// Conveyor metal detector, the search coil that rings an ore belt to catch
// steel the overband magnet missed (manganese teeth, stainless bolts)
// before it reaches a crusher. What makes it one: a rectangular coil
// frame, a heavy painted box section, standing around the troughed
// carrying belt like a doorway. Steel near the coil upsets the signal, so
// the conveyor through the detector zone has a gap in the steel stringers
// bridged by fibreglass, and fibreglass idlers carry the belt. A control
// enclosure on a post beside it shows the signal and drives a beacon stack,
// and a marker unit downstream sprays a paint mark on the ore where the
// metal is so the operator can find it after the belt trips.
// Millimetres, Z up, conveyor along X running towards +X.
meta({
  name: "metal-detector-arch",
  license: 'CC0-1.0',
  title: "Conveyor metal detector arch",
  description: "Conveyor metal detector at about real size: rectangular search-coil frame with corner gussets and junction box standing around a 1200 mm troughed ore belt, fibreglass non-metallic zone (stringer bridge and three-roll fibreglass idlers) through the coil, steel conveyor beyond it with steel idlers, legs, return belt and return idlers, control enclosure on a post with display, keypad and beacon stack, conduit to the coil, and a paint-marker spray unit downstream. Material controls: detector paint, conveyor steel, belt rubber and fibreglass, plus an alarm choice (clear with a green beacon, tripped with a red beacon, steel in the coil and a paint mark on the ore). weathered, safetyYellow and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'metal detector', 'tramp metal', 'belt conveyor', 'crusher protection'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const detectorPaint = param('detectorPaint', '#2b67b0', { label: 'Detector paint' });
const conveyorSteel = param('conveyorSteel', '#56636b', { label: 'Conveyor steel' });
const beltRubber = param('beltRubber', '#26292b', { label: 'Belt rubber' });
const fibreglass = param('fibreglass', '#d6cfa8', { label: 'Fibreglass' });
const alarm = param('alarm', 'clear', { choices: ['clear', 'tripped'], label: 'Alarm state' });
presets({
  weathered: { detectorPaint: '#4f6577', conveyorSteel: '#6a6a64', beltRubber: '#3a3a38', fibreglass: '#b3ab8c' },
  safetyYellow: { detectorPaint: '#e9b821', conveyorSteel: '#3b4246', beltRubber: '#222527', fibreglass: '#cfc8a4' },
  highVisibility: { detectorPaint: '#f08a1c', conveyorSteel: '#465159', beltRubber: '#24282a', fibreglass: '#e0dac0' },
});

const p = assembly("metal-detector-arch");
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
// (y, z) outline extruded along X from x0 to x1.
const profileYZ = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const ore = '#7d6f5e', roll = '#8d9498', black = '#1c1f21';
const tripped = alarm.value === 'tripped';
const X0 = -3600, X1 = 3600;
const NM = 1500; // half length of the non-metallic zone

// ---- Troughed conveyor ----
add('carry-belt', profileYZ([[-594, 1308], [-225, 1050], [225, 1050], [594, 1308], [606, 1292], [229, 1030], [-229, 1030], [-606, 1292]], X0, X1).color(beltRubber));
add('ore-load', profileYZ([[-470, 1222], [-225, 1052], [225, 1052], [470, 1222], [280, 1320], [0, 1360], [-280, 1320]], X0, X1).color(ore));
add('return-belt', blk(X0, -600, 560, X1, 600, 580).color(beltRubber));
for (const [k, s] of [-1, 1].entries()) {
  // Steel stringers stop short of the coil; fibreglass bridges the gap.
  add(`stringer-in-${k}`, blk(X0, s * 700 - 40, 860, -NM, s * 700 + 40, 1060).color(conveyorSteel));
  add(`stringer-out-${k}`, blk(NM, s * 700 - 40, 860, X1, s * 700 + 40, 1060).color(conveyorSteel));
  add(`fibreglass-bridge-${k}`, blk(-NM - 200, s * 700 - 35, 870, NM + 200, s * 700 + 35, 1050).color(fibreglass));
}
const idlerSet = (k, x, mat, frame) => {
  add(`idler-base-${k}`, blk(x - 40, -700, 900, x + 40, 700, 940).color(frame));
  add(`idler-centre-${k}`, cylY(60, -225, 225, x, 990, 8).color(mat));
  for (const [j, s] of [-1, 1].entries()) {
    add(`idler-wing-${k}-${j}`, tube([x, s * 240, 1000], [x, s * 600, 1252], 60, 8).color(mat));
    add(`idler-post-${k}-${j}`, blk(x - 30, s * 640 - 30, 940, x + 30, s * 640 + 30, 1240).color(frame));
  }
};
for (const [k, x] of [-3100, -2100, 2100, 3100].entries()) idlerSet(`steel-${k}`, x, roll, conveyorSteel);
for (const [k, x] of [-900, 900].entries()) idlerSet(`fibreglass-${k}`, x, fibreglass, fibreglass);
for (const [k, x] of [-2600, 2600].entries()) add(`return-idler-${k}`, cylY(55, -650, 650, x, 500, 8).color(roll));
for (const [k, x] of [-3400, -1700, 1700, 3400].entries()) {
  for (const [j, s] of [-1, 1].entries()) {
    add(`leg-${k}-${j}`, blk(x - 50, s * 700 - 50, 0, x + 50, s * 700 + 50, 860).color(conveyorSteel));
  }
  add(`leg-brace-${k}`, blk(x - 30, -700, 300, x + 30, 700, 360).color(conveyorSteel));
}

// ---- Search coil frame ----
// Aperture 1700 x 700 mm around the trough; box section 250 mm, 450 mm deep.
const YI = 850, ZI0 = 820, ZI1 = 1520, T = 250, D = 225;
add('coil-bottom', blk(-D, -YI - T, ZI0 - T, D, YI + T, ZI0).color(detectorPaint));
add('coil-top', blk(-D, -YI - T, ZI1, D, YI + T, ZI1 + T).color(detectorPaint));
for (const [k, s] of [-1, 1].entries()) {
  add(`coil-side-${k}`, blk(-D, s * (YI + T / 2) - T / 2, ZI0, D, s * (YI + T / 2) + T / 2, ZI1).color(detectorPaint));
  // Corner gussets inside the aperture.
  add(`gusset-top-${k}`, profileYZ([[s * YI, ZI1], [s * (YI - 160), ZI1], [s * YI, ZI1 - 160]], -D, D).color(detectorPaint));
  add(`gusset-bottom-${k}`, profileYZ([[s * YI, ZI0], [s * YI, ZI0 + 120], [s * (YI - 120), ZI0]], -D, D).color(detectorPaint));
  add(`coil-foot-${k}`, blk(-300, s * (YI + T / 2) - 200, 0, 300, s * (YI + T / 2) + 200, 40).color(conveyorSteel));
  add(`coil-stand-${k}`, blk(-120, s * (YI + T / 2) - 100, 40, 120, s * (YI + T / 2) + 100, ZI0 - T).color(conveyorSteel));
}
add('coil-label-band', blk(-D - 5, -YI - T, ZI1 + 40, D + 5, YI + T, ZI1 + 110).color('#f2f2ee'));
add('coil-junction-box', blk(-150, -YI - T - 160, ZI1 - 300, 150, -YI - T, ZI1 + 50).color(detectorPaint));

// ---- Control enclosure on a post, beacon stack, conduit ----
const CX = -1300, CY = -1700;
add('control-post', blk(CX - 60, CY - 60, 0, CX + 60, CY + 60, 1300).color(conveyorSteel));
add('control-post-foot', blk(CX - 200, CY - 200, 0, CX + 200, CY + 200, 30).color(conveyorSteel));
add('control-enclosure', blk(CX - 300, CY - 200, 1300, CX + 300, CY + 100, 2000).color(detectorPaint));
add('display', blk(CX - 200, CY - 210, 1720, CX + 200, CY - 200, 1920).color(tripped ? '#d94a3a' : '#5fc27a'));
add('keypad', blk(CX - 200, CY - 210, 1420, CX + 200, CY - 200, 1640).color(black));
add('beacon-base', rod(70, 2000, 2080, 10).translate(CX, CY - 50, 0).color(black));
add('beacon-red', rod(60, 2080, 2230, 10).translate(CX, CY - 50, 0).color(tripped ? '#ff3b2a' : '#7a2a24'));
add('beacon-green', rod(60, 2230, 2380, 10).translate(CX, CY - 50, 0).color(tripped ? '#2f5a38' : '#3fe06a'));
add('beacon-cap', rod(40, 2380, 2420, 10).translate(CX, CY - 50, 0).color(black));
add('conduit', tube([CX + 300, CY + 50, 1500], [0, -YI - T - 80, ZI1 - 150], 30, 6).color(black));

// ---- Paint marker unit downstream ----
const MX = 2300;
add('marker-post', blk(MX - 50, -1050, 0, MX + 50, -950, 1900).color(conveyorSteel));
add('marker-arm', blk(MX - 40, -1050, 1800, MX + 40, 0, 1880).color(conveyorSteel));
add('marker-tank', rod(120, 1600, 1950, 10).translate(MX, -1150, 0).color(detectorPaint));
add('marker-nozzle', rod(30, 1650, 1800, 6).translate(MX, -150, 0).color(black));

if (tripped) {
  // Steel in the coil and the paint mark the marker sprayed on the ore.
  add('tramp-steel', tube([-150, -200, 1370], [250, 150, 1360], 35, 6).color('#7a4a2c'));
  add('paint-mark', profileYZ([[-260, 1325], [0, 1365], [260, 1325], [260, 1340], [0, 1380], [-260, 1340]], MX + 400, MX + 900).color('#ff5aa8'));
}

return p.model();
