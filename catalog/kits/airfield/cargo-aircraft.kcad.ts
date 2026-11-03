meta({
  name: 'cargo-aircraft',
  license: 'CC0-1.0',
  title: 'Cargo aircraft',
  description: 'High-tail freighter with a broad fuselage, raised wing and four under-wing engines.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#8c8060', { label: 'Asset color' });
const p = assembly("cargo-aircraft");
p.part("fuselage", sphere(90).scale([8.222, 1, 0.72]).translate(0, 0, 190).scale(scale).color(color));
p.part("cargo-nose", sphere(66.6).scale([1.42, 0.82, 0.77]).translate(355.2, 0, 190).scale(scale).color(color));
p.part("cockpit-canopy", sphere(55.8).scale([1.05, 0.82, 0.6]).translate(177.6, 0, 245.728).scale(scale).color(color));
p.part("main-wing", extrudePolygon([[-296, -800], [207.2, -800], [29.6, 0], [207.2, 800], [-296, 800], [-88.8, 0]], 16).translate(0, 0, 213.328).scale(scale).color(color));
p.part("tailplane", extrudePolygon([[-518, -272], [-325.6, -272], [-399.6, 0], [-325.6, 272], [-518, 272], [-458.8, 0]], 14).translate(0, 0, 222.4).scale(scale).color(color));
p.part("vertical-tail", box(236.8, 16, 144, true).translate(-503.2, 0, 261.28).scale(scale).color(color));
p.part("left-wing-strut", box(12, 12, 123.12, true).translate(-44.4, -288, 177.04).scale(scale).color(color));
p.part("right-wing-strut", box(12, 12, 123.12, true).translate(-44.4, 288, 177.04).scale(scale).color(color));
p.part("engine-1", sphere(36).scale([1.85, 0.58, 0.58]).translate(29.6, -576, 179.328).scale(scale).color(color));
p.part("engine-2", sphere(36).scale([1.85, 0.58, 0.58]).translate(29.6, -320, 179.328).scale(scale).color(color));
p.part("engine-3", sphere(36).scale([1.85, 0.58, 0.58]).translate(29.6, 320, 179.328).scale(scale).color(color));
p.part("engine-4", sphere(36).scale([1.85, 0.58, 0.58]).translate(29.6, 576, 179.328).scale(scale).color(color));
p.part("nose-gear-strut", box(12, 12, 97.2, true).translate(458.8, 0, 82.6).scale(scale).color(color));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(458.8, 9, 17).scale(scale).color(color));
p.part("left-main-gear-strut", box(14, 14, 183.328, true).translate(-103.6, -224, 125.664).scale(scale).color(color));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-103.6, -215, 17).scale(scale).color(color));
p.part("right-main-gear-strut", box(14, 14, 183.328, true).translate(-103.6, 224, 125.664).scale(scale).color(color));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-103.6, 233, 17).scale(scale).color(color));

return p.model();
