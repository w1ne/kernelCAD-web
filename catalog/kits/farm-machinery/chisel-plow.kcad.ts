// SPDX-License-Identifier: CC0-1.0
// Pull-type chisel plow: a two-rank tube frame carries staggered C-shaped spring
// shanks that curve back and down to forward-pointing soil points, with coil
// spring cushions at each clamp, centre transport wheels and an A-frame tongue.
// The staggered curved shanks are what make it a chisel plow rather than a rake.
// Generic visualization geometry in millimetres, Z up, travel towards +Y.
meta({
  name: "chisel-plow",
  license: 'CC0-1.0',
  title: "Chisel plow",
  description: "Pull-type chisel plow with a two-rank frame, staggered C-shaped spring shanks, coil spring cushions, selectable straight, twisted or sweep points, centre transport wheels and an A-frame hitch tongue. Material controls: frame paint, wear steel, spring steel and tire rubber; weathered and highVisibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'tillage', 'chisel plow', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 3000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const shankCount = param('shankCount', '9', { choices: ['7', '9', '11'], label: 'Shanks' });
const pointStyle = param('pointStyle', 'twisted', {
  choices: ['straight', 'twisted', 'sweep'],
  label: 'Soil points',
});
const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Frame paint' });
const steelColor = param('steelColor', '#929b9b', { label: 'Wear steel (points)' });
const springColor = param('springColor', '#d9b43a', { label: 'Spring steel' });
const tireRubberColor = param('tireRubberColor', '#26282a', { label: 'Tire rubber' });
presets({
  weathered: {
    paintedSteelColor: '#53694d',
    steelColor: '#7c6a58',
    springColor: '#9a8650',
    tireRubberColor: '#3b3a37',
  },
  highVisibility: {
    paintedSteelColor: '#db762c',
    steelColor: '#c3c9c4',
    springColor: '#f2d23c',
    tireRubberColor: '#1d1f21',
  },
});

const n = Number(shankCount.value);
const spacing = 300;
const frameW = n * spacing + 200;
const frameZ = 640;
const frontRankY = 300;
const rearRankY = -320;
const p = assembly('chisel-plow');
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.scale(scale).color(finish));

// Closed (y, z) side outline extruded `thickness` across X, centred on x = 0.
const sideProfile = (pts, thickness) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [y, z] of pts.slice(1)) outline = outline.lineTo(y, z);
  return outline.close().extrude(thickness).rotateX(90).rotateZ(90).translate(-thickness / 2, 0, 0);
};
// A bent bar of constant width following a (y, z) centreline.
const bentBar = (line, width, thickness) => {
  const offsets = line.map((point, i) => {
    const [y0, z0] = line[Math.max(0, i - 1)];
    const [y1, z1] = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(y1 - y0, z1 - z0);
    return [(-(z1 - z0) / len) * (width / 2), ((y1 - y0) / len) * (width / 2)];
  });
  const left = line.map(([y, z], i) => [y + offsets[i][0], z + offsets[i][1]]);
  const right = line.map(([y, z], i) => [y - offsets[i][0], z - offsets[i][1]]).reverse();
  return sideProfile([...left, ...right], thickness);
};

// Frame: two ranks of square tube tied by side and centre rails.
add('front-rank-toolbar', box(frameW, 100, 100, true).translate(0, frontRankY, frameZ));
add('rear-rank-toolbar', box(frameW, 100, 100, true).translate(0, rearRankY, frameZ));
for (const x of [-frameW / 2 + 50, -450, 450, frameW / 2 - 50]) {
  add('frame-rail-' + (x < 0 ? 'l' : 'r') + Math.abs(Math.round(x)), box(90, frontRankY - rearRankY + 100, 90, true).translate(x, (frontRankY + rearRankY) / 2, frameZ));
}

// Staggered spring shanks: alternate shanks hang from the front and rear rank.
// Each C-shank leaves its clamp, sweeps back, then curls forward to the point.
const shankLine = [
  [0, frameZ - 20], [-120, frameZ - 70], [-205, frameZ - 190], [-230, 330],
  [-195, 190], [-120, 95], [-25, 42],
];
for (let i = 0; i < n; i += 1) {
  const x = (i - (n - 1) / 2) * spacing;
  const y0 = i % 2 === 0 ? frontRankY : rearRankY;
  const id = '-' + (i + 1);
  const at = (shape) => shape.translate(x, y0, 0);
  add('shank-clamp' + id, box(90, 150, 140, true).translate(x, y0 - 10, frameZ + 10));
  add('c-shank' + id, at(bentBar(shankLine, 44, 36)), springColor);
  add('spring-cushion' + id, cylinder(150, 34, 8).translate(x, y0 - 120, frameZ + 50), springColor);
  add('spring-cap' + id, cylinder(16, 48, 8).translate(x, y0 - 120, frameZ + 200), paintedSteelColor);
  if (pointStyle.value === 'sweep') {
    // Low V-shaped sweep: wide wings slice under the surface.
    const wing = path().moveTo(0, 150).lineTo(-190, -40).lineTo(-150, -75).lineTo(0, 45).lineTo(150, -75).lineTo(190, -40).close();
    add('sweep-point' + id, wing.extrude(14).rotateX(8).translate(x, y0 - 20, 21), steelColor);
  } else {
    // Narrow reversible chisel point angled down into the soil.
    const tip = sideProfile([[-80, 92], [-40, 66], [110, 10], [100, 0], [-70, 44]], 54);
    const twist = pointStyle.value === 'twisted' ? (i % 2 === 0 ? 22 : -22) : 0;
    // Lift a twisted point so its low cutting edge rests on the ground plane.
    const lift = 27 * Math.sin((Math.abs(twist) * Math.PI) / 180);
    add('chisel-point' + id, at(tip.rotateY(twist).translate(0, 0, lift)), steelColor);
  }
}

// Centre transport wheels in fork plates, set between the shank lines.
const axle = (length, radius, sides) => cylinder(length, radius, sides).rotateY(90).translate(-length / 2, 0, 0);
for (const side of [-1, 1]) {
  const x = side * 450;
  const s = side < 0 ? '-left' : '-right';
  for (const fork of [-1, 1]) {
    add('wheel-fork' + s + (fork < 0 ? '-inner' : '-outer'), bentBar([[60, frameZ], [10, 450], [-40, 280]], 70, 20).translate(x + fork * side * 92, 0, 0));
  }
  add('tire' + s, axle(150, 280, 18).translate(x, -40, 280), tireRubberColor);
  add('wheel-rim' + s, axle(164, 160, 12).translate(x, -40, 280), paintedSteelColor);
  add('wheel-axle' + s, axle(230, 34, 8).translate(x, -40, 280), steelColor);
}

// A-frame tongue converging to the clevis, with a parking jack.
const tongueL = 1500;
const hitchY = frontRankY + tongueL;
for (const side of [-1, 1]) {
  const x0 = side * (frameW / 2 - 300);
  const dx = -x0;
  const dy = tongueL;
  const len = Math.hypot(dx, dy);
  const yaw = (Math.atan2(dx, dy) * -180) / Math.PI;
  add('tongue-rail' + (side < 0 ? '-left' : '-right'), box(90, len, 90, true).rotateZ(yaw).translate(x0 / 2, frontRankY + dy / 2, frameZ));
}
add('tongue-centre-beam', box(110, tongueL, 110, true).translate(0, frontRankY + tongueL / 2, frameZ));
add('hitch-clevis', sideProfile([[-80, -55], [140, -30], [140, 30], [-80, 55]], 120).translate(0, hitchY, frameZ), steelColor);
add('parking-jack', cylinder(frameZ - 60, 36, 8).translate(0, hitchY - 380, 60), steelColor);
add('jack-foot', box(180, 180, 20, true).translate(0, hitchY - 380, 10), steelColor);
add('jack-crank', cylinder(130, 14, 6).rotateY(90).translate(0, hitchY - 380, frameZ + 40), steelColor);

return p.model();
