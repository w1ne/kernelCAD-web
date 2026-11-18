// AC disconnect switch: Utility-side isolation enclosure with external lever, cover seam and conduit stubs
meta({
  name: 'ac-disconnect-switch',
  license: 'CC0-1.0',
  title: 'AC disconnect switch',
  description: 'Utility-side isolation enclosure with external lever, cover seam and conduit stubs. Material controls: stainless steel, powder-coated steel, safety paint, rubber.',
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
const warningPaint = param('warningPaint', '#e5a032', { label: 'Safety paint' });
const rubber = param('rubber', '#262c2e', { label: 'Rubber' });
presets({
  fieldService: { stainlessSteel: '#abb5b7', powderCoat: '#7a807b', warningPaint: '#e79a2e', rubber: '#282d2e' },
  highVisibility: { stainlessSteel: '#e0e5e4', powderCoat: '#d1722b', warningPaint: '#f1b431', rubber: '#232728' },
});
const p = assembly("ac-disconnect-switch");
p.part("disconnect-plinth", box(361, 202.8, 36, true).translate(0, 0, 18).scale(scale).color(stainlessSteel));
p.part("disconnect-body", box(333, 174.8, 422.4, true).translate(0, 0, 250.2).scale(scale).color(powderCoat));
p.part("disconnect-door-1", box(301, 8, 378.4, true).translate(0, 90.4, 246.2).scale(scale).color(powderCoat));
p.part("disconnect-handle-1", box(12, 18, 72, true).translate(111.24, 101.4, 250.2).scale(scale).color(stainlessSteel));
p.part("disconnect-vent-1", box(159.84, 10, 8, true).translate(0, 99.4, 100).scale(scale).color(stainlessSteel));
p.part("disconnect-vent-2", box(159.84, 10, 8, true).translate(0, 99.4, 264.4).scale(scale).color(stainlessSteel));
p.part("disconnect-handle-base", cylinder(20, 42, 8).rotate([1, 0, 0], 90).translate(0, 107.4, 334.8).scale(scale).color(stainlessSteel));
p.part("disconnect-lever", box(26, 24, 128, true).translate(0, 101.2, 356.4).scale(scale).color(warningPaint));
p.part("conduit-0", cylinder(62, 24, 8).translate(-103.6, 0, 0).scale(scale).color(rubber));
p.part("conduit-1", cylinder(62, 24, 8).translate(103.6, 0, 0).scale(scale).color(rubber));

return p.model();
