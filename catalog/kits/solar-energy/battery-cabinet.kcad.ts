// Battery cabinet: Floor-standing storage enclosure with double doors, vents and lower service panel
meta({
  name: 'battery-cabinet',
  license: 'CC0-1.0',
  title: 'Battery cabinet',
  description: 'Floor-standing storage enclosure with double doors, vents and lower service panel. Material controls: stainless steel, powder-coated steel, safety paint.',
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
presets({
  fieldService: { stainlessSteel: '#abb5b7', powderCoat: '#7a807b', warningPaint: '#e79a2e' },
  highVisibility: { stainlessSteel: '#e0e5e4', powderCoat: '#d1722b', warningPaint: '#f1b431' },
});
const p = assembly("battery-cabinet");
p.part("battery-cabinet-plinth", box(681.6, 322, 36, true).translate(0, 0, 18).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-body", box(653.6, 294, 943.6, true).translate(0, 0, 510.8).scale(scale).color(powderCoat));
p.part("battery-cabinet-door-1", box(306.8, 8, 899.6, true).translate(-157.4, 150, 506.8).scale(scale).color(powderCoat));
p.part("battery-cabinet-handle-1", box(12, 18, 72, true).translate(-44.072, 161, 510.8).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-door-2", box(306.8, 8, 899.6, true).translate(157.4, 150, 506.8).scale(scale).color(powderCoat));
p.part("battery-cabinet-handle-2", box(12, 18, 72, true).translate(270.728, 161, 510.8).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-vent-1", box(313.728, 10, 8, true).translate(0, 159, 100).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-vent-2", box(313.728, 10, 8, true).translate(0, 159, 237.12).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-vent-3", box(313.728, 10, 8, true).translate(0, 159, 374.24).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-vent-4", box(313.728, 10, 8, true).translate(0, 159, 511.36).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-vent-5", box(313.728, 10, 8, true).translate(0, 159, 648.48).scale(scale).color(stainlessSteel));
p.part("battery-cabinet-vent-6", box(313.728, 10, 8, true).translate(0, 159, 785.6).scale(scale).color(stainlessSteel));
p.part("service-label-plate", box(136.8, 12, 90, true).translate(212.8, 151.2, 806.4).scale(scale).color(warningPaint));

return p.model();
