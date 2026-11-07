// SPDX-License-Identifier: CC0-1.0
// Pair of structural firefighting boots: a lugged rubber sole with a raised heel,
// a lofted foot that narrows from ball to heel under a rounded toe cap, a tall
// flared shaft with a reflective band, a padded collar and two pull-on loops.
// The tall shaft over a heavy toe cap is what makes it read as a bunker boot.
// Generic visualization geometry, millimetres, Z up, soles on z = 0, toes point +X.
meta({
  name: "structural-fire-boots",
  license: 'CC0-1.0',
  title: "Structural fire boots",
  description: "Pair of tall pull-on bunker boots with lugged soles, raised heels, rounded toe caps, flared shafts, reflective bands and pull loops. Material controls: protective leather, sole rubber, reflective trim and collar lining; shaft height choice; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'boots', 'ppe', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const shaftHeight = param('shaftHeight', '300', { choices: ['220', '300', '360'], label: 'Shaft height (mm)' });
const leatherColor = param('leatherColor', '#3b2f28', { label: 'Protective leather' });
const soleRubberColor = param('soleRubberColor', '#1f2326', { label: 'Sole rubber' });
const reflectiveTrimColor = param('reflectiveTrimColor', '#d9dc8a', { label: 'Reflective trim' });
const liningColor = param('liningColor', '#8a2f24', { label: 'Collar lining' });
presets({
  weathered: { leatherColor: '#4a4038', soleRubberColor: '#3a3b38', reflectiveTrimColor: '#a7a77c', liningColor: '#6a3a30' },
  highVisibility: { leatherColor: '#2a2624', soleRubberColor: '#c2402b', reflectiveTrimColor: '#f2f06a', liningColor: '#e0a22c' },
});

const shaftH = Number(shaftHeight.value);
const p = assembly("structural-fire-boots");
const add = (name, shape, finish = leatherColor) => p.part(name, shape.scale(scale).color(finish));

// Closed footprint/ring outline with a fixed point count so profiles loft cleanly:
// centred at (cx, cy), half-length a, half-width wf toward +X and wb toward -X.
const N = 14;
const outline = (cx, cy, a, wf, wb, round = 2.6) => {
  const pts = [];
  for (let i = 0; i < N; i += 1) {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + a * Math.sign(c) * Math.abs(c) ** (2 / round);
    const y = cy + (c > 0 ? wf : wb) * Math.sign(s) * Math.abs(s) ** (2 / round);
    pts.push([x, y]);
  }
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
// Stack outlines at heights z: stations are [z, cx, a, wf, wb].
const stack = (st, round = 2.6) =>
  outline(st[0][1], 0, st[0][2], st[0][3], st[0][4], round).loft(
    st.slice(1).map(([, cx, a, wf, wb]) => outline(cx, 0, a, wf, wb, round)),
    { planes: st.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })), ruled: true },
  );

for (const [side, y] of [['left', -125], ['right', 125]]) {
  const at = (shape) => shape.translate(0, y, 0);
  // Outsole: full footprint, lug ridges across the forefoot and a separate heel block.
  add(`outsole-${side}`, at(stack([[18, 55, 175, 62, 50], [40, 55, 178, 64, 52]])), soleRubberColor);
  add(`heel-block-${side}`, at(stack([[0, -70, 52, 50, 50], [20, -70, 54, 52, 52]])), soleRubberColor);
  for (let i = 0; i < 4; i += 1) {
    add(`forefoot-lug-${side}-${i + 1}`, at(box(22, 112, 18, true).translate(70 + i * 38, 0, 9)), soleRubberColor);
  }
  // Foot upper: lofted from the sole welt up to the ankle, narrowing and pulling back.
  add(`foot-upper-${side}`, at(stack([
    [40, 55, 172, 60, 49],
    [90, 40, 158, 56, 47],
    [130, 10, 118, 50, 46],
    [165, -30, 76, 47, 45],
  ])), leatherColor);
  // Rounded toe cap: a lower, shorter loft over the front of the foot.
  add(`toe-cap-${side}`, at(stack([[40, 168, 62, 62, 58], [78, 160, 54, 56, 52], [104, 146, 34, 44, 40]])), soleRubberColor);
  add(`heel-counter-${side}`, at(stack([[40, -88, 34, 50, 50], [120, -84, 26, 48, 48]])), leatherColor);
  // Tall shaft, slightly flared, with a reflective band and padded collar on top.
  add(`shaft-${side}`, at(stack([
    [150, -32, 76, 52, 52],
    [150 + shaftH * 0.5, -36, 72, 54, 54],
    [150 + shaftH, -40, 78, 58, 58],
  ], 2.2)), leatherColor);
  const bandZ = 150 + shaftH * 0.62;
  add(`reflective-band-${side}`, at(stack([[bandZ, -36, 76, 57, 57], [bandZ + 34, -37, 77, 58, 58]], 2.2)), reflectiveTrimColor);
  add(`collar-pad-${side}`, at(stack([[150 + shaftH - 4, -40, 82, 62, 62], [150 + shaftH + 26, -40, 80, 60, 60]], 2.2)), liningColor);
  // Pull-on loops either side of the collar, tilted outward.
  for (const [loop, ly] of [['inner', -60], ['outer', 60]]) {
    add(`pull-loop-${side}-${loop}`, at(box(48, 12, 70, true).rotateX(ly < 0 ? -12 : 12).translate(-40, ly, 150 + shaftH + 40)), leatherColor);
  }
  // Ankle shin guard plate on the front of the shaft.
  add(`shin-guard-${side}`, at(box(18, 70, 120, true).rotateY(-8).translate(38, 0, 215)), leatherColor);
}

return p.model();
