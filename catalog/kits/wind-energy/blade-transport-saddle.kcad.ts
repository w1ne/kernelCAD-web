// SPDX-License-Identifier: CC0-1.0
// Wind blade transport saddle: a steel trailer cradle whose twin web plates are
// cut to the underside of the blade section, lined with an elastomer pad and
// tied down by ratchet straps over the top of the blade. The curved cradle
// following an airfoil (or a round root) is what makes it a blade saddle rather
// than a generic pallet. Stylized catalog geometry, millimetres, Z up, blade
// axis along X.
meta({
  name: "blade-transport-saddle",
  license: 'CC0-1.0',
  title: "Wind blade transport saddle",
  description: "Steel blade transport cradle with I-beam base, twin web plates cut to the blade underside, elastomer liner and ratchet tie-down straps over an optional blade section. Shape choices: airfoil mid-span or round root cradle, strapped load or empty. Material controls: structural steel, elastomer, strap webbing and blade composite; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'blade', 'transport', 'cradle', 'saddle', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const section = param('section', 'midspan', { choices: ['midspan', 'root'], label: 'Cradle profile' });
const load = param('load', 'strapped', { choices: ['strapped', 'empty'], label: 'Load' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const elastomer = param('elastomer', '#30383a', { label: 'Elastomer liner' });
const strapWebbing = param('strapWebbing', '#e08a1e', { label: 'Strap webbing' });
const bladeComposite = param('bladeComposite', '#e9ebe6', { label: 'Blade composite' });

presets({
  weathered: { structuralSteel: '#425258', elastomer: '#343c3f', strapWebbing: '#a8743a', bladeComposite: '#cfd0c8' },
  highVisibility: { structuralSteel: '#d8a62b', elastomer: '#1f2426', strapWebbing: '#e4362b', bladeComposite: '#f4f5f1' },
});

const p = assembly("blade-transport-saddle");
const add = (name, shape) => p.part(name, shape.scale(scale));
const steel = (name, shape) => add(name, shape.color(structuralSteel));
const liner = (name, shape) => add(name, shape.color(elastomer));
const webbing = (name, shape) => add(name, shape.color(strapWebbing));
const composite = (name, shape) => add(name, shape.color(bladeComposite));

// Closed (y, z) outline extruded `length` along X, centred on x = 0.
const sideProfile = (pts, length) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [y, z] of pts.slice(1)) outline = outline.lineTo(y, z);
  return outline.close().extrude(length).rotateX(90).rotateZ(90).translate(-length / 2, 0, 0);
};
// Closed (x, z) outline extruded `length` along Y, centred on y = 0.
const crossProfile = (pts, length) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, z] of pts.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(length).rotateX(90).translate(0, length / 2, 0);
};
// Shift a (y, z) polyline sideways along its left-hand normal.
const offsetLine = (line, d) => line.map(([y, z], i) => {
  const [y0, z0] = line[Math.max(0, i - 1)];
  const [y1, z1] = line[Math.min(line.length - 1, i + 1)];
  const len = Math.hypot(y1 - y0, z1 - z0);
  return [y - ((z1 - z0) / len) * d, z + ((y1 - y0) / len) * d];
});
// A band of constant width following a (y, z) centreline.
const bentBar = (line, width, length) =>
  sideProfile([...offsetLine(line, width / 2), ...offsetLine(line, -width / 2).reverse()], length);
const iBeam = (w, h, web, flange) => [
  [-w / 2, 0], [w / 2, 0], [w / 2, flange], [web / 2, flange], [web / 2, h - flange], [w / 2, h - flange],
  [w / 2, h], [-w / 2, h], [-w / 2, h - flange], [-web / 2, h - flange], [-web / 2, flange], [-w / 2, flange],
];

// Blade section: a thick cambered airfoil lying chord-flat, or a round root.
const baseTop = 170;
const N = 14;
const upper = [];
const lower = [];
if (section.value === 'root') {
  const r = 400;
  const zc = baseTop + 110 + r;
  for (let i = 0; i <= N; i += 1) {
    const t = Math.PI * (1 - i / N);
    upper.push([r * Math.cos(t), zc + r * Math.sin(t)]);
    lower.push([r * Math.cos(t), zc - r * Math.sin(t)]);
  }
} else {
  const chord = 1150;
  const zc = baseTop + 250;
  for (let i = 0; i <= N; i += 1) {
    const u = (1 - Math.cos((Math.PI * i) / N)) / 2;
    const half = 5 * 0.3 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    const camber = u < 0.4 ? (0.04 / 0.16) * (0.8 * u - u * u) : (0.04 / 0.36) * (0.2 + 0.8 * u - u * u);
    const y = -chord / 2 + u * chord;
    upper.push([y, zc + chord * (camber + half)]);
    lower.push([y, zc + chord * (camber - half)]);
  }
}
const cradle = lower.slice(2, N - 1);

// Base: two I-beam cross bearers under the webs, channel side rails and lashing lugs.
for (const x of [-300, 300]) steel('bearer' + (x < 0 ? '-front' : '-rear'), crossProfile(iBeam(150, baseTop, 14, 18), 1300).translate(x, 0, 0));
for (const side of [-1, 1]) {
  const s = side < 0 ? '-left' : '-right';
  const channel = [[-50, 0], [50, 0], [50, 16], [-34, 16], [-34, 104], [50, 104], [50, 120], [-50, 120]].map(([y, z]) => [side * y, z]);
  steel('side-rail' + s, sideProfile(channel, 820).translate(0, side * 610, 25));
  for (const x of [-300, 300]) {
    steel('lashing-lug' + s + (x < 0 ? '-front' : '-rear'), sideProfile([[0, 0], [110, 0], [80, 90], [30, 90]].map(([y, z]) => [side * (y + 660), z + 40]), 24).translate(x, 0, 0));
  }
}

// Cradle: web plates cut to the blade underside, a steel shell and the liner.
const linerT = 40;
const shellT = 14;
const shellLine = offsetLine(cradle, -(linerT + shellT / 2));
const webTop = offsetLine(cradle, -(linerT + shellT));
const webOutline = [[webTop[0][0], baseTop], ...webTop, [webTop[webTop.length - 1][0], baseTop]];
for (const x of [-280, 280]) {
  const s = x < 0 ? '-front' : '-rear';
  steel('web-plate' + s, sideProfile(webOutline, 22).translate(x, 0, 0));
  for (const y of [webTop[0][0] + 40, webTop[webTop.length - 1][0] - 40]) {
    steel('web-gusset' + s + (y < 0 ? '-left' : '-right'), crossProfile([[0, 0], [90, 0], [0, 150]], 16).rotateZ(x < 0 ? 180 : 0).translate(x, y, baseTop));
  }
}
steel('cradle-shell', bentBar(shellLine, shellT, 680));
liner('elastomer-liner', bentBar(offsetLine(cradle, -linerT / 2), linerT, 740));

if (load.value === 'strapped') {
  // A short length of blade, cut square both ends, resting in the liner.
  composite('blade-section', sideProfile([...upper, ...lower.slice(1, N).reverse()], 1200));
  // Ratchet straps run from each lashing lug up and over the blade top.
  const over = offsetLine(upper.slice(1, N), 8);
  for (const x of [-170, 170]) {
    const s = x < 0 ? '-front' : '-rear';
    const strap = [[-700, 120], [over[0][0] - 40, over[0][1] - 60], ...over, [over[over.length - 1][0] + 40, over[over.length - 1][1] - 60], [700, 120]];
    webbing('tie-down-strap' + s, bentBar(strap, 8, 50).translate(x, 0, 0));
    const [ya, za] = strap[strap.length - 2];
    const tilt = (Math.atan2(za - 120, 700 - ya) * 180) / Math.PI;
    steel('ratchet-buckle' + s, box(80, 140, 50, true).rotateX(-tilt).translate(x, (ya + 700) / 2, (za + 120) / 2 + 20));
  }
}

return p.model();
