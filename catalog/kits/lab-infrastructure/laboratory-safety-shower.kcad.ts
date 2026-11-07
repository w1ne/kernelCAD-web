// SPDX-License-Identifier: CC0-1.0
// Free-standing combination emergency drench shower and eyewash station.
// What makes it a safety shower rather than a coat stand: a safety-yellow
// pipe column on a floor flange, a top elbow carrying a horizontal arm out to
// a wide shallow drench head with a hanging pull rod and triangle handle, a
// stay-open ball valve, and at waist height a bowl eyewash on its own arm with
// twin capped spray heads and a push flag, plus the green first-aid sign.
// Generic visualization geometry at real size (about 2.3 m tall), millimetres,
// Z up, user stands on the -Y side, floor flange on z = 0.
meta({
  name: 'laboratory-safety-shower',
  license: 'CC0-1.0',
  title: 'Laboratory safety shower',
  description: 'Combination emergency drench shower and eyewash: safety-yellow pipe column on a floor flange, top elbow and arm to a wide drench head, stay-open valve with hanging pull rod and triangle handle, waist-height bowl eyewash with twin capped spray heads and push flag, green first-aid sign. Material controls: pipe enamel, head and bowl stainless, cap and handle polymer, sign green. With or without eyewash; cleanroom and high-visibility presets.',
  tags: ['safety shower', 'emergency shower', 'drench shower', 'eyewash', 'combination station', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const eyewash = param('eyewash', 'bowl', { choices: ['bowl', 'none'], label: 'Eyewash' });
const enamel = param('enamel', '#f2c418', { label: 'Pipe and fitting enamel' });
const polymer = param('polymer', '#e2622b', { label: 'Dust cap, push flag and handle polymer' });
const stainless = param('stainless', '#c6ced1', { label: 'Drench head and bowl stainless' });
const sign = param('sign', '#1d8a4c', { label: 'First-aid sign green' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', stainless: '#d0d9d8', sign: '#2a9a62' },
  highVisibility: { enamel: '#ffe000', polymer: '#1f2a30', stainless: '#6f8488', sign: '#0f7a3c' },
});

const p = assembly('laboratory-safety-shower');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Pipe fitting (elbow or tee body) as a short fat sleeve.
const fitting = (name, at) => add(name, turned([[0, -40], [30, -40], [30, 40], [0, 40]]).translate(at[0], at[1], at[2]).color(enamel));

const TOP = 2240;
const ARM_Y = -620;

// Floor flange and column.
add('floor-flange', turned([[0, 0], [150, 0], [150, 16], [60, 34], [0, 34]]).color(enamel));
add('column', rod([0, 0, 20], [0, 0, TOP], 21).color(enamel));
fitting('top-elbow', [0, 0, TOP]);

// Arm to the drench head, ball valve and pull rod.
add('shower-arm', rod([0, 0, TOP], [0, ARM_Y, TOP], 21).color(enamel));
add('ball-valve', turned([[0, -42], [36, -42], [44, 0], [36, 42], [0, 42]]).rotateX(90).translate(0, -260, TOP).color(enamel));
add('valve-lever', box(26, 16, 140, true).translate(0, -260, TOP - 95).color(enamel));
add('pull-rod', rod([0, -260, TOP - 160], [0, -260, 1560], 7, 6).color(stainless));
const TRI = [[0, -260, 1560], [-110, -260, 1390], [110, -260, 1390]];
for (let i = 0; i < 3; i += 1) {
  add(`pull-handle-${i}`, rod(TRI[i], TRI[(i + 1) % 3], 12, 8).color(polymer));
}
fitting('head-elbow', [0, ARM_Y, TOP]);
add('head-nipple', rod([0, ARM_Y, TOP], [0, ARM_Y, TOP - 90], 21).color(enamel));
add('drench-head', turned([[0, 0], [70, 0], [140, 10], [150, 22], [140, 30], [60, 60], [24, 80], [0, 80]]).translate(0, ARM_Y, TOP - 170).color(stainless));
add('head-diffuser', turned([[0, -6], [120, -6], [128, 4], [0, 4]]).translate(0, ARM_Y, TOP - 170).color(polymer));

// First-aid sign on the column, facing the user.
add('sign-plate', box(300, 6, 300, true).translate(0, -26, 1800).color(sign));
add('sign-cross-v', box(70, 4, 200, true).translate(0, -31, 1800).color(stainless));
add('sign-cross-h', box(200, 4, 70, true).translate(0, -31, 1800).color(stainless));

// Waist-height bowl eyewash with twin capped spray heads and a push flag.
if (eyewash.value === 'bowl') {
  const EZ = 980;
  const EY = -330;
  fitting('eyewash-tee', [0, 0, EZ - 60]);
  add('eyewash-arm', rod([0, 0, EZ - 60], [0, EY, EZ - 60], 16).color(enamel));
  add('eyewash-bowl', turned([[0, 0], [60, 0], [150, 60], [168, 110], [158, 112], [140, 72], [60, 16], [0, 16]]).translate(0, EY, EZ - 60).color(stainless));
  add('bowl-drain', rod([0, EY, EZ - 60], [0, EY, 280], 16).color(enamel));
  add('drain-elbow', turned([[0, -30], [24, -30], [24, 30], [0, 30]]).translate(0, EY, 280).color(enamel));
  add('drain-return', rod([0, EY, 280], [0, 0, 280], 16).color(enamel));
  for (const x of [-60, 60]) {
    add(`spray-riser-${x}`, rod([x, EY, EZ - 50], [x, EY, EZ + 20], 9, 8).color(stainless));
    add(`spray-head-${x}`, turned([[0, 0], [22, 0], [26, 18], [0, 22]]).translate(x, EY, EZ + 20).color(stainless));
    add(`dust-cap-${x}`, turned([[0, 0], [28, 0], [30, 12], [18, 24], [0, 26]]).translate(x, EY, EZ + 40).color(polymer));
  }
  add('push-flag', extrudePolygon([[0, 0], [130, -20], [150, 80], [10, 90]], 8).rotateX(90).rotateZ(-20).translate(190, EY - 40, EZ - 30).color(polymer));
  add('flag-stem', rod([150, EY, EZ - 60], [195, EY - 30, EZ - 30], 9, 6).color(stainless));
}

return p.model();
