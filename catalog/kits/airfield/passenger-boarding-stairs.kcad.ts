// Passenger boarding stairs: Towable mobile stairway with a stepped flight, upper landing, handrails and four wheels. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'passenger-boarding-stairs',
  license: 'CC0-1.0',
  title: 'Passenger boarding stairs',
  description: 'Towable mobile stairway with a stepped flight, upper landing, handrails and four wheels. Material controls: powder-coated steel, galvanized steel, tyre rubber. Appearance presets: weathered and high visibility.',
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
const p = assembly("passenger-boarding-stairs");
p.part("chassis", box(391, 193.6, 42, true).translate(0, 0, 56).scale(scale).color(powderCoat));
p.part("base-platform", box(377.2, 171.6, 28, true).translate(-9.2, 0, 68).scale(scale).color(galvanizedSteel));
p.part("upper-landing", box(124.2, 158.4, 24, true).translate(-128.8, 0, 456).scale(scale).color(powderCoat));
p.part("step-01", box(174.8, 101.2, 16, true).translate(82.8, 0, 92).scale(scale).color(galvanizedSteel));
p.part("step-02", box(174.8, 101.2, 16, true).translate(63.8, 0, 135).scale(scale).color(galvanizedSteel));
p.part("step-03", box(174.8, 101.2, 16, true).translate(44.8, 0, 178).scale(scale).color(galvanizedSteel));
p.part("step-04", box(174.8, 101.2, 16, true).translate(25.8, 0, 221).scale(scale).color(galvanizedSteel));
p.part("step-05", box(174.8, 101.2, 16, true).translate(6.8, 0, 264).scale(scale).color(galvanizedSteel));
p.part("step-06", box(174.8, 101.2, 16, true).translate(-12.2, 0, 307).scale(scale).color(galvanizedSteel));
p.part("step-07", box(174.8, 101.2, 16, true).translate(-31.2, 0, 350).scale(scale).color(galvanizedSteel));
p.part("left-handrail", box(239.2, 10, 10, true).rotate([0, 1, 0], -31).translate(-27.6, -59.4, 330.4).scale(scale).color(galvanizedSteel));
p.part("right-handrail", box(239.2, 10, 10, true).rotate([0, 1, 0], -31).translate(-27.6, 59.4, 330.4).scale(scale).color(galvanizedSteel));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-142.6, -98.4, 38).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-142.6, 130.4, 38).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(142.6, -98.4, 38).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(142.6, 130.4, 38).scale(scale).color(rubber));

return p.model();
