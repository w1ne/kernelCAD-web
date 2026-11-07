// PV panel cleaning robot: Tracked panel-cleaning carriage with four idler wheels per side and a full-width brush shaft
meta({
  name: 'pv-panel-cleaning-robot',
  license: 'CC0-1.0',
  title: 'PV panel cleaning robot',
  description: 'Tracked panel-cleaning carriage with four idler wheels per side and a full-width brush shaft. Material controls: polymer, rubber, galvanized steel, stainless steel.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#daddd7', { label: 'Polymer' });
const rubber = param('rubber', '#262c2e', { label: 'Rubber' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#c3caca', { label: 'Stainless steel' });
presets({
  fieldService: { polymer: '#cdd2cb', rubber: '#282d2e', galvanizedSteel: '#68787b', stainlessSteel: '#abb5b7' },
  highVisibility: { polymer: '#e6e0d1', rubber: '#232728', galvanizedSteel: '#536367', stainlessSteel: '#e0e5e4' },
});
const p = assembly("pv-panel-cleaning-robot");
p.part("cleaning-robot-body", box(426.4, 224.4, 104.5, true).translate(0, 0, 95).translate(0, 0, 10).scale(scale).color(polymer));
p.part("robot-track--138-6", box(478.4, 34, 42, true).translate(0, -138.6, 30).translate(0, 0, 10).scale(scale).color(rubber));
p.part("robot-track-138-6", box(478.4, 34, 42, true).translate(0, 138.6, 30).translate(0, 0, 10).scale(scale).color(rubber));
p.part("brush-shaft", cylinder(478.4, 22, 8).rotate([0, 1, 0], 90).translate(-239.2, 0, 12).translate(0, 0, 10).scale(scale).color(galvanizedSteel));
p.part("brush-bar", box(468, 36, 34, true).translate(0, 118.8, 20).translate(0, 0, 10).scale(scale).color(polymer));
p.part("handle-rail", box(291.2, 24, 28, true).translate(-130, 0, 167.2).translate(0, 0, 10).scale(scale).color(galvanizedSteel));

p.part("robot-idler-left-0", cylinder(35,22,10).rotate([1,0,0],90).translate(-170,-121.1,30).scale(scale).color(stainlessSteel));
p.part("robot-idler-left-1", cylinder(35,22,10).rotate([1,0,0],90).translate(-57,-121.1,30).scale(scale).color(stainlessSteel));
p.part("robot-idler-left-2", cylinder(35,22,10).rotate([1,0,0],90).translate(57,-121.1,30).scale(scale).color(stainlessSteel));
p.part("robot-idler-left-3", cylinder(35,22,10).rotate([1,0,0],90).translate(170,-121.1,30).scale(scale).color(stainlessSteel));
p.part("robot-idler-right-0", cylinder(35,22,10).rotate([1,0,0],90).translate(-170,156.1,30).scale(scale).color(stainlessSteel));
p.part("robot-idler-right-1", cylinder(35,22,10).rotate([1,0,0],90).translate(-57,156.1,30).scale(scale).color(stainlessSteel));
p.part("robot-idler-right-2", cylinder(35,22,10).rotate([1,0,0],90).translate(57,156.1,30).scale(scale).color(stainlessSteel));
p.part("robot-idler-right-3", cylinder(35,22,10).rotate([1,0,0],90).translate(170,156.1,30).scale(scale).color(stainlessSteel));

return p.model();
