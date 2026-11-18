// Airport fire engine: Airport rescue truck with a pale crew cab, red equipment body, roof monitor, raised metallic ladder, heavy axles and metal compartment doors. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'airport-fire-engine',
  license: 'CC0-1.0',
  title: 'Airport fire engine',
  description: 'Airport rescue truck with a pale crew cab, red equipment body, roof monitor, raised metallic ladder, heavy axles and metal compartment doors. Material controls: rescue vehicle paint, crew cab paint, stainless steel, tyre rubber. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vehiclePaint = param('vehiclePaint', '#d93a31', { label: 'Rescue vehicle paint' });
const cabPaint = param('cabPaint', '#e7e8df', { label: 'Crew cab paint' });
const stainlessSteel = param('stainlessSteel', '#a9b4b6', { label: 'Stainless steel' });
const rubber = param('rubber', '#282e31', { label: 'Tyre rubber' });

presets({
  weathered: {
    vehiclePaint: '#596765',
    cabPaint: '#596765',
    stainlessSteel: '#536267',
    rubber: '#202528',
  },
  highVisibility: {
    vehiclePaint: '#f0b52f',
    cabPaint: '#f0b52f',
    stainlessSteel: '#aeb9bb',
    rubber: '#262b2e',
  },
});
const p = assembly("airport-fire-engine");
p.part("chassis", box(552.5, 228.8, 42, true).translate(0, 0, 56).scale(scale).color(stainlessSteel));
p.part("cab", box(162.5, 213.2, 205.2, true).translate(195, 0, 185.6).scale(scale).color(cabPaint));
p.part("equipment-body", box(312, 223.6, 235.6, true).translate(-117, 0, 203.8).scale(scale).color(vehiclePaint));
p.part("roof-monitor", cylinder(48, 17, 8).translate(-117, 0, 321.6).scale(scale).color(stainlessSteel));
p.part("monitor-nozzle", box(88, 16, 14, true).translate(-77, 0, 374.6).scale(scale).color(stainlessSteel));
p.part("wheel-1-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-201.5, -119.2, 38).scale(scale).color(rubber));
p.part("wheel-1-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(-201.5, 151.2, 38).scale(scale).color(rubber));
p.part("wheel-2-left", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(201.5, -119.2, 38).scale(scale).color(rubber));
p.part("wheel-2-right", cylinder(16, 38, 8).rotate([1, 0, 0], 90).translate(201.5, 151.2, 38).scale(scale).color(rubber));

p.part("equipment-compartment-front", box(92, 5, 82, true).translate(-193, -113.6, 205).scale(scale).color(stainlessSteel));
p.part("equipment-compartment-rear", box(92, 5, 82, true).translate(-49, -113.6, 205).scale(scale).color(stainlessSteel));
p.part("roof-ladder-outer-rail", box(260, 12, 12, true).translate(-117, -42, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-inner-rail", box(260, 12, 12, true).translate(-117, 42, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-1", box(10, 84, 10, true).translate(-230, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-2", box(10, 84, 10, true).translate(-195, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-3", box(10, 84, 10, true).translate(-160, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-4", box(10, 84, 10, true).translate(-74, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-5", box(10, 84, 10, true).translate(-39, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-6", box(10, 84, 10, true).translate(-4, 0, 328).scale(scale).color(stainlessSteel));

return p.model();
