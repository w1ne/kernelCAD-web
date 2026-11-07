// Passenger jet bridge: Telescoping passenger bridge with a terminal connector, support column and aircraft docking head. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'passenger-jet-bridge',
  license: 'CC0-1.0',
  title: 'Passenger jet bridge',
  description: 'Telescoping passenger bridge with a terminal connector, support column and aircraft docking head. Material controls: powder-coated steel, galvanized steel, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#d6a72d', { label: 'Powder-coated steel' });
const galvanizedSteel = param('galvanizedSteel', '#89989c', { label: 'Galvanized steel' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber' });

presets({
  weathered: {
    powderCoat: '#596765',
    galvanizedSteel: '#536267',
    rubber: '#202528',
  },
  highVisibility: {
    powderCoat: '#d6a72d',
    galvanizedSteel: '#aeb9bb',
    rubber: '#262b2e',
  },
});
const p = assembly("passenger-jet-bridge");
p.part("terminal-base", box(240, 220, 190, true).translate(-280, 0, 95).scale(scale).color(galvanizedSteel));
p.part("terminal-connector", box(170, 155, 135, true).translate(-220, 0, 248).scale(scale).color(powderCoat));
p.part("telescoping-section", box(370, 130, 118, true).translate(30, 0, 230).scale(scale).color(powderCoat));
p.part("docking-head", box(165, 190, 142, true).translate(285, 0, 240).scale(scale).color(powderCoat));
p.part("support-column", box(40, 40, 205, true).translate(20, 0, 105).scale(scale).color(galvanizedSteel));
p.part("support-wheel-base", box(180, 118, 22, true).translate(20, 0, 12).scale(scale).color(rubber));
p.part("support-wheel-left", cylinder(16, 28, 8).rotate([1, 0, 0], 90).translate(20, -43, 28).scale(scale).color(rubber));
p.part("support-wheel-right", cylinder(16, 28, 8).rotate([1, 0, 0], 90).translate(20, 67, 28).scale(scale).color(rubber));

return p.model();
