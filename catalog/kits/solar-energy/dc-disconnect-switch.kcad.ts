// DC disconnect switch: Compact DC isolation cabinet with a projecting rotary handle and cable ports
meta({
  name: 'dc-disconnect-switch',
  license: 'CC0-1.0',
  title: 'DC disconnect switch',
  description: 'Compact DC isolation cabinet with a projecting rotary handle and cable ports. Material controls: stainless steel, powder-coated steel, safety paint, rubber.',
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
const p = assembly("dc-disconnect-switch");
p.part("disconnect-plinth", box(343, 195.2, 36, true).translate(0, 0, 18).scale(scale).color(stainlessSteel));
p.part("disconnect-body", box(315, 167.2, 388, true).translate(0, 0, 233).scale(scale).color(powderCoat));
p.part("disconnect-door-1", box(283, 8, 344, true).translate(0, 86.6, 229).scale(scale).color(powderCoat));
p.part("disconnect-handle-1", box(12, 18, 72, true).translate(104.76, 97.6, 233).scale(scale).color(stainlessSteel));
p.part("disconnect-vent-1", box(151.2, 10, 8, true).translate(0, 95.6, 100).scale(scale).color(stainlessSteel));
p.part("disconnect-vent-2", box(151.2, 10, 8, true).translate(0, 95.6, 230).scale(scale).color(stainlessSteel));
p.part("disconnect-handle-base", cylinder(20, 42, 8).rotate([1, 0, 0], 90).translate(0, 103.6, 310).scale(scale).color(stainlessSteel));
p.part("disconnect-lever", box(26, 24, 128, true).translate(0, 96.8, 330).scale(scale).color(warningPaint));
p.part("conduit-0", cylinder(62, 24, 8).translate(-98, 0, 0).scale(scale).color(rubber));
p.part("conduit-1", cylinder(62, 24, 8).translate(98, 0, 0).scale(scale).color(rubber));

return p.model();
