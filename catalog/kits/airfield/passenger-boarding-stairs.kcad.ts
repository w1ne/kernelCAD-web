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
p.part("step-01", box(237.0, 118.8, 48.2, true).translate(51.5, 0, 106.1).scale(scale).color(galvanizedSteel));
p.part("step-02", box(203.1, 118.8, 96.5, true).translate(34.5, 0, 130.2).scale(scale).color(galvanizedSteel));
p.part("step-03", box(169.2, 118.8, 144.8, true).translate(17.6, 0, 154.4).scale(scale).color(galvanizedSteel));
p.part("step-04", box(135.3, 118.8, 193.0, true).translate(0.7, 0, 178.5).scale(scale).color(galvanizedSteel));
p.part("step-05", box(101.4, 118.8, 241.2, true).translate(-16.3, 0, 202.6).scale(scale).color(galvanizedSteel));
p.part("step-06", box(67.5, 118.8, 289.5, true).translate(-33.2, 0, 226.8).scale(scale).color(galvanizedSteel));
p.part("step-07", box(33.6, 118.8, 337.8, true).translate(-50.2, 0, 250.9).scale(scale).color(galvanizedSteel));
p.part("landing-post-left", box(12, 12, 362, true).translate(-128.8, -70, 263).scale(scale).color(galvanizedSteel));
p.part("landing-post-right", box(12, 12, 362, true).translate(-128.8, 70, 263).scale(scale).color(galvanizedSteel));
p.part("rail-post-left", box(10, 10, 62, true).translate(-67, -59.4, 499).scale(scale).color(galvanizedSteel));
p.part("rail-post-right", box(10, 10, 62, true).translate(-67, 59.4, 499).scale(scale).color(galvanizedSteel));
p.part("left-handrail", box(456, 10, 10, true).rotate([0, 1, 0], 58.7).translate(51.5, -59.4, 335).scale(scale).color(galvanizedSteel));
p.part("right-handrail", box(456, 10, 10, true).rotate([0, 1, 0], 58.7).translate(51.5, 59.4, 335).scale(scale).color(galvanizedSteel));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-142.6, -98.4, 38).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-142.6, 130.4, 38).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(142.6, -98.4, 38).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(142.6, 130.4, 38).scale(scale).color(rubber));

return p.model();
