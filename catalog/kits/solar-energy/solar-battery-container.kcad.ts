// Solar battery container: Corrugated battery enclosure with paired service doors on both long faces, raised hinges, louvered vents, lifting corners and end-mounted cooling units
meta({
  name: 'solar-battery-container',
  license: 'CC0-1.0',
  title: 'Solar battery container',
  description: 'Corrugated battery enclosure with paired service doors on both long faces, raised hinges, louvered vents, lifting corners and end-mounted cooling units. Material controls: powder-coated steel, stainless steel.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#687c7c', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#c3caca', { label: 'Stainless steel' });
presets({
  fieldService: { powderCoat: '#7a807b', stainlessSteel: '#abb5b7' },
  highVisibility: { powderCoat: '#d1722b', stainlessSteel: '#e0e5e4' },
});
const p = assembly("solar-battery-container");
p.part("battery-container-plinth", box(1594, 819.2, 36, true).translate(0, 0, 18).scale(scale).color(powderCoat));
p.part("battery-container-body", box(1566, 791.2, 1073.2, true).translate(0, 0, 575.6).scale(scale).color(powderCoat));
p.part("battery-container-door-1", box(763, 8, 1029.2, true).translate(-385.5, 398.6, 571.6).scale(scale).color(powderCoat));
p.part("battery-container-handle-1", box(12, 18, 72, true).translate(-107.94, 409.6, 575.6).scale(scale).color(stainlessSteel));
p.part("battery-container-door-2", box(763, 8, 1029.2, true).translate(385.5, 398.6, 571.6).scale(scale).color(powderCoat));
p.part("battery-container-handle-2", box(12, 18, 72, true).translate(663.06, 409.6, 575.6).scale(scale).color(stainlessSteel));
p.part("battery-container-vent-1", box(751.68, 10, 8, true).translate(0, 407.6, 100).scale(scale).color(stainlessSteel));
p.part("battery-container-vent-2", box(751.68, 10, 8, true).translate(0, 407.6, 235.867).scale(scale).color(stainlessSteel));
p.part("battery-container-vent-3", box(751.68, 10, 8, true).translate(0, 407.6, 371.733).scale(scale).color(stainlessSteel));
p.part("battery-container-vent-4", box(751.68, 10, 8, true).translate(0, 407.6, 507.6).scale(scale).color(stainlessSteel));
p.part("battery-container-vent-5", box(751.68, 10, 8, true).translate(0, 407.6, 643.467).scale(scale).color(stainlessSteel));
p.part("battery-container-vent-6", box(751.68, 10, 8, true).translate(0, 407.6, 779.333).scale(scale).color(stainlessSteel));
p.part("battery-container-vent-7", box(751.68, 10, 8, true).translate(0, 407.6, 915.2).scale(scale).color(stainlessSteel));
p.part("lifting-corner-0", box(120, 828, 120, true).translate(-730.8, 0, 1251.2).scale(scale).color(stainlessSteel));
p.part("lifting-corner-1", box(120, 828, 120, true).translate(730.8, 0, 1251.2).scale(scale).color(stainlessSteel));
p.part("cooling-unit-0", box(90, 313.2, 462.4, true).translate(-790, 0, 571.2).scale(scale).color(stainlessSteel));
p.part("cooling-unit-1", box(90, 313.2, 462.4, true).translate(790, 0, 571.2).scale(scale).color(stainlessSteel));

p.part("container-corrugation-rib-left-0", box(20,18,970,true).translate(-790,-315,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-left-1", box(20,18,970,true).translate(-790,-225,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-left-2", box(20,18,970,true).translate(-790,-135,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-left-3", box(20,18,970,true).translate(-790,-45,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-left-4", box(20,18,970,true).translate(-790,45,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-left-5", box(20,18,970,true).translate(-790,135,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-left-6", box(20,18,970,true).translate(-790,225,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-left-7", box(20,18,970,true).translate(-790,315,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-0", box(20,18,970,true).translate(790,-315,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-1", box(20,18,970,true).translate(790,-225,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-2", box(20,18,970,true).translate(790,-135,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-3", box(20,18,970,true).translate(790,-45,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-4", box(20,18,970,true).translate(790,45,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-5", box(20,18,970,true).translate(790,135,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-6", box(20,18,970,true).translate(790,225,575.6).scale(scale).color(stainlessSteel));
p.part("container-corrugation-rib-right-7", box(20,18,970,true).translate(790,315,575.6).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-left--690-0", box(28,18,92,true).translate(-690,410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-left--690-1", box(28,18,92,true).translate(-690,410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-left--690-2", box(28,18,92,true).translate(-690,410,930).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-left--80-0", box(28,18,92,true).translate(-80,410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-left--80-1", box(28,18,92,true).translate(-80,410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-left--80-2", box(28,18,92,true).translate(-80,410,930).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-right-80-0", box(28,18,92,true).translate(80,410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-right-80-1", box(28,18,92,true).translate(80,410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-right-80-2", box(28,18,92,true).translate(80,410,930).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-right-690-0", box(28,18,92,true).translate(690,410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-right-690-1", box(28,18,92,true).translate(690,410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-front-right-690-2", box(28,18,92,true).translate(690,410,930).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-door-1", box(763,8,1029.2,true).translate(-385.5,-398.6,571.6).scale(scale).color(powderCoat));
p.part("battery-container-rear-door-2", box(763,8,1029.2,true).translate(385.5,-398.6,571.6).scale(scale).color(powderCoat));
p.part("battery-container-rear-handle-1", box(12,18,72,true).translate(-107.94,-409.6,575.6).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-handle-2", box(12,18,72,true).translate(663.06,-409.6,575.6).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-vent-1", box(751.68,10,8,true).translate(0,-407.6,100).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-vent-2", box(751.68,10,8,true).translate(0,-407.6,235.867).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-vent-3", box(751.68,10,8,true).translate(0,-407.6,371.733).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-vent-4", box(751.68,10,8,true).translate(0,-407.6,507.6).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-vent-5", box(751.68,10,8,true).translate(0,-407.6,643.467).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-vent-6", box(751.68,10,8,true).translate(0,-407.6,779.333).scale(scale).color(stainlessSteel));
p.part("battery-container-rear-vent-7", box(751.68,10,8,true).translate(0,-407.6,915.2).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-left--690-0", box(28,18,92,true).translate(-690,-410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-left--690-1", box(28,18,92,true).translate(-690,-410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-left--690-2", box(28,18,92,true).translate(-690,-410,930).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-left--80-0", box(28,18,92,true).translate(-80,-410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-left--80-1", box(28,18,92,true).translate(-80,-410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-left--80-2", box(28,18,92,true).translate(-80,-410,930).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-right-80-0", box(28,18,92,true).translate(80,-410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-right-80-1", box(28,18,92,true).translate(80,-410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-right-80-2", box(28,18,92,true).translate(80,-410,930).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-right-690-0", box(28,18,92,true).translate(690,-410,210).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-right-690-1", box(28,18,92,true).translate(690,-410,575).scale(scale).color(stainlessSteel));
p.part("container-door-hinge-rear-right-690-2", box(28,18,92,true).translate(690,-410,930).scale(scale).color(stainlessSteel));

return p.model();
