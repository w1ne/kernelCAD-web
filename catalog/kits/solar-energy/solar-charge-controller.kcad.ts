// Solar charge controller: Wall control unit with a raised display, button row and lower cable glands
meta({
  name: 'solar-charge-controller',
  license: 'CC0-1.0',
  title: 'Solar charge controller',
  description: 'Wall control unit with a raised display, button row and lower cable glands. Material controls: stainless steel, powder-coated steel, display glass, safety paint.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#c3caca', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#687c7c', { label: 'Powder-coated steel' });
const displayGlass = param('displayGlass', '#24515d', { label: 'Display glass' });
const warningPaint = param('warningPaint', '#e5a032', { label: 'Safety paint' });
presets({
  fieldService: { stainlessSteel: '#abb5b7', powderCoat: '#7a807b', displayGlass: '#376a73', warningPaint: '#e79a2e' },
  highVisibility: { stainlessSteel: '#e0e5e4', powderCoat: '#d1722b', displayGlass: '#167d95', warningPaint: '#f1b431' },
});
const p = assembly("solar-charge-controller");
p.part("controller-plinth", box(323.2, 179.2, 36, true).translate(0, 0, 18).scale(scale).color(stainlessSteel));
p.part("controller-body", box(295.2, 151.2, 302, true).translate(0, 0, 190).scale(scale).color(powderCoat));
p.part("controller-door-1", box(263.2, 8, 258, true).translate(0, 78.6, 186).scale(scale).color(powderCoat));
p.part("controller-handle-1", box(12, 18, 72, true).translate(97.632, 89.6, 190).scale(scale).color(stainlessSteel));
p.part("controller-vent-1", box(141.696, 10, 8, true).translate(0, 87.6, 100).scale(scale).color(stainlessSteel));
p.part("controller-vent-2", box(141.696, 10, 8, true).translate(0, 87.6, 128).scale(scale).color(stainlessSteel));
p.part("controller-vent-3", box(141.696, 10, 8, true).translate(0, 87.6, 156).scale(scale).color(stainlessSteel));
p.part("controller-screen", box(129.6, 14, 77.4, true).translate(0, 88.2, 292.4).scale(scale).color(displayGlass));
p.part("controller-button-0", cylinder(18, 12, 8).rotate([1, 0, 0], 90).translate(-79.2, 99.9, 180.6).scale(scale).color(warningPaint));
p.part("controller-button-1", cylinder(18, 12, 8).rotate([1, 0, 0], 90).translate(0, 99.9, 180.6).scale(scale).color(warningPaint));
p.part("controller-button-2", cylinder(18, 12, 8).rotate([1, 0, 0], 90).translate(79.2, 99.9, 180.6).scale(scale).color(warningPaint));

return p.model();
