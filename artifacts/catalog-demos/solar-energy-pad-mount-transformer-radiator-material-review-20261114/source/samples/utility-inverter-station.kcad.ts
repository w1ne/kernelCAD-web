// Utility inverter station: Containerized inverter station with service doors, ventilation louvers and cable plinth
meta({
  name: 'utility-inverter-station',
  license: 'CC0-1.0',
  title: 'Utility inverter station',
  description: 'Containerized inverter station with service doors, ventilation louvers and cable plinth. Material controls: stainless steel, powder-coated steel.',
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
presets({
  fieldService: { stainlessSteel: '#abb5b7', powderCoat: '#7a807b' },
  highVisibility: { stainlessSteel: '#e0e5e4', powderCoat: '#d1722b' },
});
const p = assembly("utility-inverter-station");
p.part("station-plinth", box(1330.4, 766, 36, true).translate(0, 0, 18).scale(scale).color(stainlessSteel));
p.part("station-body", box(1302.4, 738, 764.4, true).translate(0, 0, 421.2).scale(scale).color(powderCoat));
p.part("station-door-1", box(631.2, 8, 720.4, true).translate(-319.6, 372, 417.2).scale(scale).color(powderCoat));
p.part("station-handle-1", box(12, 18, 72, true).translate(-89.488, 383, 421.2).scale(scale).color(stainlessSteel));
p.part("station-door-2", box(631.2, 8, 720.4, true).translate(319.6, 372, 417.2).scale(scale).color(powderCoat));
p.part("station-handle-2", box(12, 18, 72, true).translate(549.712, 383, 421.2).scale(scale).color(stainlessSteel));
p.part("station-vent-1", box(625.152, 10, 8, true).translate(0, 381, 100).scale(scale).color(stainlessSteel));
p.part("station-vent-2", box(625.152, 10, 8, true).translate(0, 381, 201.28).scale(scale).color(stainlessSteel));
p.part("station-vent-3", box(625.152, 10, 8, true).translate(0, 381, 302.56).scale(scale).color(stainlessSteel));
p.part("station-vent-4", box(625.152, 10, 8, true).translate(0, 381, 403.84).scale(scale).color(stainlessSteel));
p.part("station-vent-5", box(625.152, 10, 8, true).translate(0, 381, 505.12).scale(scale).color(stainlessSteel));
p.part("station-vent-6", box(625.152, 10, 8, true).translate(0, 381, 606.4).scale(scale).color(stainlessSteel));
p.part("station-end-vent-0", box(120, 540, 358.4, true).translate(-532.8, 0, 504).scale(scale).color(stainlessSteel));
p.part("station-end-vent-1", box(120, 540, 358.4, true).translate(532.8, 0, 504).scale(scale).color(stainlessSteel));
p.part("station-cable-plinth", box(1406, 855, 95, true).translate(0, 0, 48).scale(scale).color(stainlessSteel));

return p.model();
