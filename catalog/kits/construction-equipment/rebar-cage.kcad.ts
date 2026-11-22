// SPDX-License-Identifier: CC0-1.0
// Reinforcing cage scene prop with two bar layers inside closed rectangular ties.
// Generic low-poly geometry in millimetres; not a structural reinforcement schedule.
meta({
  name: "rebar-cage",
  license: 'CC0-1.0',
  title: "Reinforcing bar cage",
  description: "Short reinforcing cage with twelve distinct longitudinal bars in two layers and eight closed rectangular ties seated on support saddles. Generic visualization prop, not structural design or manufacturing CAD. Material controls: equipment enamel paint and structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { equipmentPaintColor: '#a87b36', structuralSteelColor: '#716b61' },
  highVisibility: { equipmentPaintColor: '#f06b26', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('rebar-cage');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('assembly-skid', box(1260, 558, 35, true).translate(0, 0, 17.5), equipmentPaintColor);
add('support-saddle--1', box(1176, 35, 111.6, true).translate(0, -235.6, 90.8), structuralSteelColor);
add('support-saddle-1', box(1176, 35, 111.6, true).translate(0, 235.6, 90.8), structuralSteelColor);
// The lower layer rests inside the ties; the upper layer closes the cage volume.
// Keeping separate Z coordinates prevents coincident duplicate longitudinal bars.
const barLength = 1148;
const barRadius = 18;
const layerHeights = [180.6, 372];
const barOffsets = [-236, -141.6, -47.2, 47.2, 141.6, 236];
for (const [layer, z] of layerHeights.entries()) {
  for (const [index, y] of barOffsets.entries()) {
    add(`longitudinal-bar-${layer === 0 ? 'lower' : 'upper'}-${index}`,
      cylinder(barLength, barRadius, 6).rotateY(90).translate(-barLength / 2, y, z),
      structuralSteelColor);
  }
}

// Each tie is one closed YZ frame with an open centre, not a transverse rod.
// Its underside sits at z = 146.6 mm, the top of both support saddles.
const tieBottom = 146.6;
const tieTop = 406;
const tieHeight = tieTop - tieBottom;
for (const [index, x] of [-532, -380, -228, -76, 76, 228, 380, 532].entries()) {
  const tie = box(16, 540, tieHeight, true)
    .subtract(box(18, 508, tieHeight - 32, true))
    .translate(x, 0, (tieBottom + tieTop) / 2);
  add(`tie-ring-${index}`, tie, structuralSteelColor);
}

return p.model();
