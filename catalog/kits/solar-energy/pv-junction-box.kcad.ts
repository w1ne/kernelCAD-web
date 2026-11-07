// PV junction box: Low-profile sealed junction enclosure with lid rim and four cable glands
meta({
  name: 'pv-junction-box',
  license: 'CC0-1.0',
  title: 'PV junction box',
  description: 'Low-profile sealed junction enclosure with lid rim and four cable glands. Material controls: stainless steel, powder-coated steel, rubber.',
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
const rubber = param('rubber', '#262c2e', { label: 'Rubber' });
presets({
  fieldService: { stainlessSteel: '#abb5b7', powderCoat: '#7a807b', rubber: '#282d2e' },
  highVisibility: { stainlessSteel: '#e0e5e4', powderCoat: '#d1722b', rubber: '#232728' },
});
const p = assembly("pv-junction-box");
p.part("junction-plinth", box(298, 204.4, 36, true).translate(0, 0, 18).scale(scale).color(stainlessSteel));
p.part("junction-body", box(270, 176.4, 55.5, true).translate(0, 0, 66.75).scale(scale).color(powderCoat));
p.part("junction-door-1", box(238, 8, 11.5, true).translate(0, 91.2, 62.75).scale(scale).color(powderCoat));
p.part("junction-handle-1", box(12, 18, 72, true).translate(88.56, 102.2, 66.75).scale(scale).color(stainlessSteel));
p.part("junction-gland-0", cylinder(32, 18, 8).translate(-93, 0, 0).scale(scale).color(rubber));
p.part("junction-gland-1", cylinder(32, 18, 8).translate(-30, 0, 0).scale(scale).color(rubber));
p.part("junction-gland-2", cylinder(32, 18, 8).translate(30, 0, 0).scale(scale).color(rubber));
p.part("junction-gland-3", cylinder(32, 18, 8).translate(93, 0, 0).scale(scale).color(rubber));

return p.model();
