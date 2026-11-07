// SPDX-License-Identifier: CC0-1.0
// Crawler dozer: the tracked bulldozer that pushes earth. What makes it one:
// two long steel crawler tracks with grouser plates, idler and drive sprocket
// at the ends and bottom rollers between; a tall curved push blade across the
// full width at the front on push arms with tilt rams; a long engine hood with
// exhaust stack between the tracks; a glazed ROPS cab at the rear; and a
// single-shank ripper hanging off the back.
// Generic visualization geometry at about real size (about 6.4 m long with
// blade and ripper, 3.3 m blade width, 3.2 m tall), millimetres, Z up, blade
// toward +X, track grousers on z = 0.
meta({
  name: "crawler-dozer",
  license: 'CC0-1.0',
  title: "Crawler dozer",
  description: "Crawler dozer at about real size: two steel crawler tracks with grouser plates, idler, drive sprocket and bottom rollers; full-width curved push blade on push arms with tilt rams and a steel cutting edge; long engine hood with exhaust stack and grille; glazed ROPS cab; single-shank rear ripper. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['crawler dozer', 'bulldozer', 'dozer', 'tracked tractor', 'earthmoving', 'construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 6000
});
const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cabGlassColor = param('cabGlassColor', '#77a4b0', { label: 'Cab glass' });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { cabGlassColor: '#66858b', equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { cabGlassColor: '#91bdc6', equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});

const p = assembly('crawler-dozer');
const add = (name, shape, finish) => p.part(name, shape.scale(scale).color(finish));

// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
// Front outline [[y, z], ...] extruded along X, centred on x0.
const front = (pts, t, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);
// A bent bar of width w following a centreline [[x, z], ...].
const bar = (line, w) => {
  const left = [];
  const right = [];
  line.forEach(([x, z], i) => {
    const [ax, az] = line[Math.max(0, i - 1)];
    const [bx, bz] = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    left.push([x + (nx * w) / 2, z + (nz * w) / 2]);
    right.push([x - (nx * w) / 2, z - (nz * w) / 2]);
  });
  return [...left, ...right.reverse()];
};
// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Hydraulic ram (barrel plus chrome rod) between two side-view points.
const ram = (name, [ax, az], [bx, bz], y, r) => {
  const len = Math.hypot(bx - ax, bz - az);
  const tilt = (Math.atan2(bx - ax, bz - az) * 180) / Math.PI;
  const place = (s) => s.rotateY(tilt).translate(ax, y, az);
  add(`${name}-barrel`, place(turned([[0, 0], [r, 0], [r, len * 0.55], [0, len * 0.55]])), equipmentPaintColor);
  add(`${name}-rod`, place(turned([[0, len * 0.5], [r * 0.5, len * 0.5], [r * 0.5, len], [0, len]])), structuralSteelColor);
};
// Crawler tracks: dark steel belt, painted roller frame, idler, sprocket,
// bottom rollers and grouser plates.
const trackPts = filletPolygon([[-1750, 30], [1650, 30], [1950, 450], [1650, 860], [-1650, 860], [-1950, 450]], 220);
for (const s of [-1, 1]) {
  const y = s * 1010;
  const tag = s > 0 ? 'left' : 'right';
  add(`track-belt-${tag}`, side(trackPts, 560, y), tireRubberColor);
  add(`track-frame-${tag}`, side(filletPolygon([[-1450, 220], [1450, 220], [1600, 450], [1450, 680], [-1450, 680], [-1600, 450]], 80), 40, y + s * 290), equipmentPaintColor);
  add(`idler-${tag}`, turned([[0, -10], [360, -10], [360, 30], [0, 30]]).rotateX(90).translate(1600, y + s * 290, 450), structuralSteelColor);
  const teeth = Array.from({ length: 22 }, (_, i) => {
    const r = i % 2 ? 330 : 400;
    const a = (Math.PI * i) / 11;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  add(`sprocket-${tag}`, side(teeth.map(([a, b]) => [a - 1600, b + 450]), 60, y + s * 300), structuralSteelColor);
  for (let i = 0; i < 6; i++) {
    add(`bottom-roller-${tag}-${i}`, turned([[0, -10], [130, -10], [130, 30], [0, 30]]).rotateX(90).translate(-1050 + i * 420, y + s * 290, 250), structuralSteelColor);
  }
  for (let i = 0; i < 20; i++) {
    const x = -1640 + i * 172;
    add(`grouser-bottom-${tag}-${i}`, box(60, 560, 40, true).translate(x, y, 20), tireRubberColor);
    add(`grouser-top-${tag}-${i}`, box(60, 560, 40, true).translate(x, y, 870), tireRubberColor);
  }
}

// Main frame between the tracks, engine hood, grille and exhaust.
add('main-frame', side([[-1800, 300], [1900, 300], [1900, 950], [-1800, 950]], 1420), structuralSteelColor);
add('hood', side(filletPolygon([[-200, 900], [2050, 900], [2100, 1500], [1950, 1820], [-200, 1900]], 70), 1260), equipmentPaintColor);
add('grille', front([[-520, 1000], [520, 1000], [480, 1700], [-480, 1700]], 30, 2105), structuralSteelColor);
for (let i = 0; i < 5; i++) add(`grille-bar-${i}`, front([[-480, 0], [480, 0], [480, 30], [-480, 30]], 20, 2125).translate(0, 0, 1100 + i * 130), equipmentPaintColor);
add('exhaust-stack', turned([[0, 0], [75, 0], [75, 900], [90, 950], [0, 950]]).translate(900, -350, 1830), structuralSteelColor);
add('precleaner', turned([[0, 0], [90, 0], [90, 280], [140, 300], [140, 420], [0, 440]]).translate(1300, 350, 1800), structuralSteelColor);
for (const s of [-1, 1]) add(`fender-${s}`, side([[-1900, 900], [1700, 900], [1700, 950], [-1900, 950]], 520, s * 1010), equipmentPaintColor);

// ROPS cab over the rear.
add('cab-base', side([[-1900, 950], [-200, 950], [-200, 1350], [-1900, 1350]], 1500), equipmentPaintColor);
add('cab-glass', side([[-1800, 1350], [-250, 1350], [-180, 2950], [-1700, 3000]], 1340), cabGlassColor);
for (const [x0, x1] of [[-1860, -1760], [-280, -180]]) {
  for (const s of [-1, 1]) {
    add(`cab-post-${x0}-${s}`, side([[x0, 1350], [x1, 1350], [x1 + 30, 3020], [x0 + 30, 3020]], 100, s * 680), equipmentPaintColor);
  }
}
add('cab-roof', side(filletPolygon([[-2000, 3000], [-50, 3000], [-100, 3200], [-1950, 3200]], 50), 1600), equipmentPaintColor);
add('cab-handrail', side(bar([[-1500, 1100], [-1500, 1300], [-200, 1300]], 50), 50, -800), structuralSteelColor);

// Push blade: curved moldboard, cutting edge, end bits and push arms.
// Moldboard arc: concave toward the front, bottom and top edges forward.
const bladeArc = [];
for (let i = 0; i <= 10; i++) {
  const a = ((232 - (i * 104) / 10) * Math.PI) / 180;
  bladeArc.push([2950 + 1000 * Math.cos(a), 900 + 1000 * Math.sin(a)]);
}
add('blade', side(bar(bladeArc, 80), 3300), equipmentPaintColor);
add('blade-back', side([[1780, 250], [1900, 250], [1900, 1500], [1780, 1400]], 3000), equipmentPaintColor);
add('cutting-edge', side([[2270, 0], [2420, 0], [2380, 180], [2240, 180]], 3300), structuralSteelColor);
for (const s of [-1, 1]) add(`end-bit-${s}`, side([[2150, 0], [2420, 0], [2330, 300], [2200, 300]], 60, s * 1650), structuralSteelColor);
for (const s of [-1, 1]) add(`blade-side-plate-${s}`, side([[1850, 150], ...bladeArc, [1850, 1600]], 40, s * 1630), equipmentPaintColor);
for (const s of [-1, 1]) {
  add(`push-arm-${s}`, side(bar([[-300, 450], [1000, 430], [1800, 420]], 170), 170, s * 1350), equipmentPaintColor);
  ram(`lift-ram-${s}`, [1600, 1750], [1830, 1350], s * 560, 80);
  ram(`tilt-ram-${s}`, [500, 900], [1820, 1250], s * 1350, 60);
}

// Single-shank ripper on a parallelogram frame at the rear.
add('ripper-mount', side([[-2100, 400], [-1800, 400], [-1800, 1000], [-2100, 1000]], 1300), structuralSteelColor);
for (const s of [-1, 1]) add(`ripper-link-${s}`, side(bar([[-2000, 900], [-2600, 900]], 150), 120, s * 450), equipmentPaintColor);
add('ripper-beam', side([[-2700, 600], [-2450, 600], [-2450, 1050], [-2700, 1050]], 1100), equipmentPaintColor);
add('ripper-shank', side([[-2650, 1100], [-2470, 1100], [-2470, 300], [-2550, 80], [-2700, 50], [-2650, 350]], 110), structuralSteelColor);
add('ripper-tip', side([[-2720, 0], [-2560, 120], [-2700, 160], [-2860, 30]], 120), structuralSteelColor);
ram('ripper-ram', [-1850, 1300], [-2500, 1000], 0, 70);

return p.model();
