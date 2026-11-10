// Slim mechanical pencil: a turned aluminum barrel, separate rubber grip,
// tapered metal nose, exposed graphite lead, click button and pocket clip.
// Generic desk-scale visualization, millimetres, Z up, lead toward +X.
meta({
  name: 'mechanical-pencil',
  license: 'CC0-1.0',
  title: 'Mechanical pencil',
  description: 'Slim mechanical pencil with a turned barrel, ribbed elastomer grip, tapered nose, exposed lead, click button and pocket clip. Controls: barrel aluminum, grip rubber, accent polymer and graphite; compact and standard formats.',
  tags: ['mechanical pencil', 'pencil', 'writing tool', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 900,
});

const aluminum = param('aluminum', '#9aa6aa', { label: 'Barrel aluminum' });
const rubber = param('rubber', '#30363a', { label: 'Grip rubber' });
const polymer = param('polymer', '#d85e4d', { label: 'Accent polymer' });
const graphite = param('graphite', '#25292b', { label: 'Graphite lead' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;
const axisZ = 4.65;

presets({
  professional: { aluminum: '#9aa6aa', rubber: '#30363a', polymer: '#d85e4d', graphite: '#25292b' },
  classroom: { aluminum: '#4a7892', rubber: '#394947', polymer: '#607e54', graphite: '#d4ae4c' },
});

const office = assembly('mechanical-pencil');
const add = (name, shape, material) => {
  const scaled = shape.scale(k);
  if (material === aluminum) office.part(name, scaled.color(aluminum));
  else if (material === rubber) office.part(name, scaled.color(rubber));
  else if (material === polymer) office.part(name, scaled.color(polymer));
  else office.part(name, scaled.color(graphite));
};

// Turn a radial/axial profile into a low-poly solid, then lay it along +X.
const turned = (pts) => {
  let profile = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) profile = profile.lineTo(r, z);
  return profile.close().revolve();
};
const alongX = (shape, x = 0, y = 0) => shape.rotateY(90).translate(x, y, axisZ);
const prism = (pts, depth) => {
  let profile = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) profile = profile.lineTo(x, y);
  return profile.close().extrude(depth);
};

// The main barrel has a rolled tail and a small shoulder before the grip.
add('barrel', alongX(turned([
  [0, 0], [3.3, 0], [4.1, 1.5], [4.65, 4], [4.65, 82], [4.1, 88], [3.8, 91], [0, 91],
])), aluminum);
add('barrel-shoulder-ring', alongX(turned([[0, 0], [4.65, 0], [4.65, 3], [0, 3]]), 88), aluminum);

// Distinct rubber sleeve and raised plated ribs make the grip readable and
// keep the graphite control reserved for the actual writing lead.
add('elastomer-grip', alongX(turned([
  [0, 0], [4.3, 0], [4.2, 3], [4.0, 23], [3.7, 27], [0, 27],
]), 90), rubber);
for (let i = 0; i < 4; i += 1) {
  const x = 94 + i * 5;
  add(`grip-rib-${i + 1}`, alongX(turned([[0, 0], [4.38, 0], [4.38, 0.9], [0, 0.9]]), x), aluminum);
}

// Metal nose narrows to the lead; the graphite projects just beyond its tip.
add('tapered-nose', alongX(turned([
  [0, 0], [4.1, 0], [3.9, 3], [3.0, 9], [1.45, 17], [1.2, 18], [0, 18],
]), 115), aluminum);
add('graphite-lead', cylinder(12, 1.05, 10).rotateY(90).translate(132, 0, axisZ), graphite);

// Rounded click button at the rear and a shaped spring clip on the barrel.
add('click-button', alongX(turned([[0, 0], [3.5, 0], [4.0, 1.5], [3.8, 5.5], [0, 5.5]]), -5.5), polymer);
const clip = prism([
  [0, 0], [35, 0.6], [41, 2.4], [43, 5.3], [40, 6], [37, 3.2], [4, 2.2],
], 1.8).rotateX(90).translate(27, 2.8, 7.8);
add('pocket-clip', clip, aluminum);

return office.model();
