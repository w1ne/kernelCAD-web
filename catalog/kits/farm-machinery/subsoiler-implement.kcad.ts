// SPDX-License-Identifier: CC0-1.0
// Three-point-mounted deep subsoiler: a heavy square toolbar with an A-frame
// mast and hitch pins, deep parabolic or straight-leaning shanks with shin
// guards and winged or plain points, rolling coulter discs ahead of each shank
// and depth gauge wheels at the toolbar ends. Tall single shanks reaching far
// below the bar are what distinguish it from a chisel plow.
// Generic visualization geometry in millimetres, Z up, travel towards +Y.
meta({
  name: "subsoiler-implement",
  license: 'CC0-1.0',
  title: "Subsoiler implement",
  description: "Three-point-mounted deep subsoiler with an A-frame mast and hitch pins, selectable parabolic or straight shanks with shin guards, plain or winged points, rolling coulter discs and depth gauge wheels. Material controls: frame paint, wear steel, hitch and coulter hardware and tire rubber; weathered and highVisibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'tillage', 'subsoiler', 'ripper', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const shankCount = param('shankCount', '5', { choices: ['3', '5', '7'], label: 'Shanks' });
const shankStyle = param('shankStyle', 'parabolic', { choices: ['parabolic', 'straight'], label: 'Shank shape' });
const pointWings = param('pointWings', 'winged', { choices: ['plain', 'winged'], label: 'Points' });
const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Frame paint' });
const steelColor = param('steelColor', '#929b9b', { label: 'Wear steel (points and shins)' });
const hardwareColor = param('hardwareColor', '#c7c2b4', { label: 'Hitch and coulter hardware' });
const tireRubberColor = param('tireRubberColor', '#26282a', { label: 'Tire rubber' });
presets({
  weathered: {
    paintedSteelColor: '#53694d',
    steelColor: '#7c6a58',
    hardwareColor: '#8d877a',
    tireRubberColor: '#3b3a37',
  },
  highVisibility: {
    paintedSteelColor: '#db762c',
    steelColor: '#c3c9c4',
    hardwareColor: '#e8e3d2',
    tireRubberColor: '#1d1f21',
  },
});

const n = Number(shankCount.value);
const spacing = 560;
const barW = n * spacing + 300;
const barZ = 780;
const p = assembly('subsoiler-implement');
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
const axle = (length, radius, sides) => cylinder(length, radius, sides).rotateY(90).translate(-length / 2, 0, 0);

// Toolbar and three-point headstock: two tall mast plates rise to the top-link
// pin; lower-link pins sit on brackets at the front of the bar.
add('main-toolbar', box(barW, 180, 180, true).translate(0, 0, barZ));
for (const side of [-1, 1]) {
  const s = side < 0 ? '-left' : '-right';
  add('mast-plate' + s, sideProfile([[-90, barZ - 90], [150, barZ - 90], [150, barZ + 90], [60, 1500], [-10, 1500], [-90, barZ + 90]], 24).translate(side * 170, 0, 0));
  add('mast-brace' + s, bentBar([[-90, barZ + 90], [-300, barZ + 90], [-20, 1460]], 60, 50).translate(side * 170, 0, 0));
  add('lower-hitch-bracket' + s, sideProfile([[80, barZ - 90], [300, barZ - 260], [380, barZ - 240], [380, barZ - 180], [150, barZ + 20]], 30).translate(side * 470, 0, 0));
  add('lower-hitch-pin' + s, axle(200, 26, 8).translate(side * 520, 340, barZ - 210), hardwareColor);
}
add('top-link-pin', axle(420, 22, 8).translate(0, 25, 1450), hardwareColor);

// Deep shanks clamp to the back of the bar and reach well below it.
const legLine = shankStyle.value === 'parabolic'
  ? [[-110, barZ + 60], [-110, 520], [-95, 330], [-50, 190], [20, 95], [110, 45]]
  : [[-110, barZ + 60], [-60, 480], [-10, 220], [40, 95], [110, 45]];
const shinLine = legLine.slice(1).map(([y, z]) => [y + 34, z]);
for (let i = 0; i < n; i += 1) {
  const x = (i - (n - 1) / 2) * spacing;
  const id = '-' + (i + 1);
  const at = (shape) => shape.translate(x, 0, 0);
  add('shank-clamp' + id, box(130, 240, 220, true).translate(x, -20, barZ), hardwareColor);
  add('subsoiler-shank' + id, at(bentBar(legLine, 70, 32)));
  add('shin-guard' + id, at(bentBar(shinLine, 18, 38)), steelColor);
  add('subsoiler-point' + id, at(sideProfile([[40, 120], [250, 12], [240, 0], [20, 70]], 48)), steelColor);
  if (pointWings.value === 'winged') {
    const wings = path().moveTo(0, 90).lineTo(-170, -60).lineTo(-140, -90).lineTo(0, 10).lineTo(140, -90).lineTo(170, -60).close();
    add('point-wings' + id, wings.extrude(12).rotateX(-10).translate(x, 120, 50), steelColor);
  }
  // Rolling coulter on a forward arm slices residue ahead of the shank.
  add('coulter-arm' + id, bentBar([[90, barZ], [330, barZ - 40], [430, 310]], 60, 40).translate(x, 0, 0));
  add('coulter-disc' + id, axle(10, 230, 18).translate(x + 34, 430, 260), hardwareColor);
  add('coulter-hub' + id, axle(70, 50, 8).translate(x, 430, 260), hardwareColor);
}

// Depth gauge wheels on arms off each toolbar end.
for (const side of [-1, 1]) {
  const s = side < 0 ? '-left' : '-right';
  const x = side * (barW / 2 + 140);
  add('gauge-arm' + s, bentBar([[60, barZ], [10, 560], [-200, 250]], 80, 40).translate(side * (barW / 2 + 30), 0, 0));
  add('gauge-tire' + s, axle(160, 250, 18).translate(x, -200, 250), tireRubberColor);
  add('gauge-rim' + s, axle(172, 140, 12).translate(x, -200, 250), paintedSteelColor);
  add('gauge-axle' + s, axle(260, 30, 8).translate(side * (barW / 2 + 90), -200, 250), hardwareColor);
  add('depth-adjust-screw' + s, cylinder(260, 22, 6).translate(side * (barW / 2 + 30), -60, barZ + 90), hardwareColor);
}

return p.model();
