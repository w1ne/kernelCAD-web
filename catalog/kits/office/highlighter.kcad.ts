// Broad chisel-tip highlighter: a rounded polymer barrel, removable cap and
// pocket clip lead to a sloped felt nib with a visible fluorescent face.
// Generic desk-scale visualization, millimetres, Z up, nib toward +X.
meta({
  name: 'highlighter',
  license: 'CC0-1.0',
  title: 'Highlighter',
  description: 'Broad chisel-tip highlighter with a rounded barrel, removable cap, pocket clip and visible ink face. Controls: barrel polymer, cap polymer, felt and fluorescent ink; compact and standard formats.',
  tags: ['highlighter', 'marker pen', 'office', 'stationery', 'writing tool'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 320,
});

const barrelPolymer = param('barrelPolymer', '#eac633', { label: 'Barrel polymer' });
const capPolymer = param('capPolymer', '#d39124', { label: 'Cap polymer' });
const felt = param('felt', '#bd6a36', { label: 'Felt nib' });
const fluorescentInk = param('fluorescentInk', '#eff24d', { label: 'Fluorescent ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: {
    barrelPolymer: '#eac633', capPolymer: '#d39124', felt: '#bd6a36', fluorescentInk: '#eff24d',
  },
  classroom: {
    barrelPolymer: '#4d9a7b', capPolymer: '#34765f', felt: '#405b8a', fluorescentInk: '#ff9444',
  },
});

const office = assembly('highlighter');
const add = (name, shape, material) => {
  const scaled = shape.scale(k);
  if (material === barrelPolymer) office.part(name, scaled.color(barrelPolymer));
  else if (material === capPolymer) office.part(name, scaled.color(capPolymer));
  else if (material === felt) office.part(name, scaled.color(felt));
  else office.part(name, scaled.color(fluorescentInk));
};

// Rounded low-poly rectangle, sampled around the four corners.
const roundedRect = (w, h, r) => {
  const pts = [];
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, 90],
    [-w / 2 + r, -h / 2 + r, 180],
    [w / 2 - r, -h / 2 + r, 270],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 3; i += 1) {
      const a = ((a0 + i * 30) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  let profile = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) profile = profile.lineTo(x, y);
  return profile.close();
};
const prism = (pts, depth) => {
  let profile = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) profile = profile.lineTo(x, y);
  return profile.close().extrude(depth);
};
const roundedBar = (w, d, r, length, x, zCenter) =>
  roundedRect(w, d, r).extrude(length).rotateY(90).translate(x, 0, zCenter);

// The rounded cap is wider than the barrel and overlaps its shoulder so it
// reads as a fitted removable piece instead of another flat block.
add('barrel', roundedBar(20, 18, 4, 96, 18, 10), barrelPolymer);
add('cap', roundedBar(26, 24, 6, 31, -5, 13), capPolymer);
add('cap-crown', roundedBar(18, 18, 5, 3, -7, 13), capPolymer);

// A bent side clip sits against the cap and body; its raised tail is visible
// above the barrel in the default three-quarter catalog view.
const clip = prism([
  [0, 0], [23, 0], [30, 3], [34, 8], [31, 10], [27, 5], [4, 5], [1, 4],
], 2.2).rotateX(90).translate(-2, -11.6, 12.5);
add('pocket-clip', clip, capPolymer);

// The wedge is a side profile in X/Z, extruded across the narrower nib width.
// Its thin end face carries the fluorescent-ink color as a readable cue.
const nib = prism([[0, 0], [15, 3], [15, 14], [0, 20]], 13)
  .rotateX(90).translate(108, 6.5, 0);
add('felt-chisel-nib', nib, felt);
add('fluorescent-ink-face', box(12, 12.5, 1.6, true).rotateY(21.8).translate(118, 0, 16.7), fluorescentInk);

return office.model();
