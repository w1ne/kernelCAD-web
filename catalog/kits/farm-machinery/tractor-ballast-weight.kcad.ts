// SPDX-License-Identifier: CC0-1.0
// Tractor ballast weight: the counterweight a tractor carries on its
// three-point linkage to keep the front wheels down under a loader or the
// rear down under a heavy front implement. What makes it one rather than a
// box: either a sculpted cast-iron block with chamfered shoulders, stepped
// cheeks and a raised front badge, or a stack of hand-sized suitcase weights
// with lifting handles hung on a bar, both carried by a steel frame with two
// lower-link pins, a top-link mast with its pin, linch pins and a lifting eye.
// Generic visualization geometry at real size (about 1 m wide, 900 kg cast
// block), millimetres, Z up, linkage side +Y, block on z = 0.
meta({
  name: "tractor-ballast-weight",
  license: 'CC0-1.0',
  title: "Tractor ballast weight",
  description: "Three-point tractor ballast at real size: a sculpted cast-iron block with chamfered shoulders, stepped cheeks and a front badge, or a stack of suitcase weights with handles on a hanger bar, carried by a steel frame with two lower-link pins, a top-link mast and pin, linch pins and a lifting eye. Style choice cast block or suitcase stack. Material controls: cast iron, frame steel, pins and badge; tractorGreen, deepRed and weathered presets.",
  tags: ['ballast weight', 'counterweight', 'suitcase weights', 'three point hitch', 'tractor', 'farm machinery', 'agriculture', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 3000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const style = param('style', 'cast block', { choices: ['cast block', 'suitcase stack'], label: 'Ballast style' });
const castIron = param('castIron', '#3a3f3d', { label: 'Cast iron' });
const frameSteel = param('frameSteel', '#3d7a3a', { label: 'Frame paint' });
const pinZinc = param('pinZinc', '#c7c9c2', { label: 'Pins and lifting eye' });
const badge = param('badge', '#e0b22a', { label: 'Badge and decals' });
presets({
  tractorGreen: { castIron: '#2f6a33', frameSteel: '#2f3336', badge: '#e3c020' },
  deepRed: { castIron: '#a8261f', frameSteel: '#2b2b2b', badge: '#e6e6e0' },
  weathered: { castIron: '#55473b', frameSteel: '#4f5b4a', pinZinc: '#8f8b80', badge: '#a99551' },
});

const p = assembly('tractor-ballast-weight');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Plate across X (thickness t, centred on x = 0) from a side profile in [y, z] points.
const sidePlate = (pts, t) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

if (style.value === 'cast block') {
  // Sculpted block: chamfered core, stepped cheeks, top recess and badge.
  add('cast-core', sidePlate([[60, 0], [-380, 0], [-440, 70], [-440, 420], [-330, 600], [-120, 650], [60, 650]], 840).color(castIron));
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'left' : 'right';
    add(`cast-cheek-${k}`, sidePlate([[60, 30], [-340, 30], [-400, 90], [-400, 400], [-300, 560], [60, 600]], 90).translate(s * 465, 0, 0).color(castIron));
    add(`cast-shoulder-${k}`, sidePlate([[40, 600], [-260, 590], [-200, 680], [40, 690]], 160).translate(s * 300, 0, 0).color(castIron));
  }
  add('front-badge', sidePlate([[-446, 200], [-446, 400], [-430, 410], [-430, 190]], 420).color(badge));
  add('badge-stripe', sidePlate([[-336, 590], [-326, 610], [-130, 655], [-130, 640]], 700).color(badge));
  add('lift-eye-left-leg', rod([-60, -160, 640], [-60, -160, 790], 18, 6).color(pinZinc));
  add('lift-eye-right-leg', rod([60, -160, 640], [60, -160, 790], 18, 6).color(pinZinc));
  add('lift-eye-top', rod([-78, -160, 790], [78, -160, 790], 18, 6).color(pinZinc));
} else {
  // Suitcase stack: twelve handled weights hung on a hanger bar.
  add('stack-base', box(980, 380, 60, true).translate(0, -190, 30).color(frameSteel));
  add('hanger-bar', box(980, 70, 70, true).translate(0, -40, 470).color(frameSteel));
  const n = 12;
  for (let i = 0; i < n; i++) {
    const x = -440 + i * 80;
    add(`suitcase-${i}`, sidePlate([[-20, 60], [-330, 60], [-360, 100], [-360, 380], [-300, 440], [-250, 440], [-250, 380], [-140, 380], [-140, 440], [-60, 440], [-20, 500], [10, 500], [10, 410], [-20, 410]], 74).translate(x, 0, 0).color(castIron));
  }
  add('stack-tie-rod', rod([-500, -200, 250], [500, -200, 250], 16, 6).color(pinZinc));
  for (const s of [-1, 1]) add(`stack-tie-nut-${s < 0 ? 'left' : 'right'}`, rod([s * 500, -200, 250], [s * 530, -200, 250], 30, 6).color(pinZinc));
  add('stack-decal', box(400, 6, 60, true).translate(0, -363, 240).color(badge));
}

// Three-point frame: back plate, lower-link pins and top-link mast.
add('back-plate', box(900, 50, 560, true).translate(0, 85, 340).color(frameSteel));
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  add(`lower-link-lug-${k}`, sidePlate([[60, 140], [200, 170], [200, 290], [60, 320]], 30).translate(s * 400, 0, 0).color(frameSteel));
  add(`lower-link-pin-${k}`, rod([s * 330, 160, 230], [s * 520, 160, 230], 14, 8).color(pinZinc));
  add(`lower-link-linch-${k}`, rod([s * 500, 160, 270], [s * 500, 160, 190], 5, 4).color(pinZinc));
  add(`mast-plate-${k}`, sidePlate([[60, 560], [110, 560], [220, 880], [160, 920], [60, 760]], 20).translate(s * 45, 0, 0).color(frameSteel));
  add(`mast-brace-${k}`, rod([s * 300, 100, 600], [s * 45, 140, 820], 18, 6).color(frameSteel));
}
add('top-link-pin', rod([-80, 175, 860], [80, 175, 860], 14, 8).color(pinZinc));

return p.model();
