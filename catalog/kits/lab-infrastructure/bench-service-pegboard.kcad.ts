// SPDX-License-Identifier: CC0-1.0
// Raised laboratory bench backboard with a perforated-looking panel, rails and utility clips.
meta({
  name: 'bench-service-pegboard',
  license: 'CC0-1.0',
  title: 'Bench service pegboard',
  description: 'Raised laboratory bench backboard with a perforated-looking panel, rails and utility clips. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('bench-service-pegboard');
p.part('backplate', box(1200, 80, 720, true).translate(0, 0, 360).scale(scale).color(enamel));
p.part('top-rail', box(1248, 18, 70, true).translate(0, -49.6, 720).scale(scale).color(steel));
p.part('bottom-rail', box(1248, 18, 70, true).translate(0, -49.6, 70).scale(scale).color(steel));
p.part('service-clip-0-0', box(24, 20, 46, true).translate(-504, -52, 224.6).scale(scale).color(stainless));
p.part('service-clip-0-1', box(24, 20, 46, true).translate(-504, -52, 361.4).scale(scale).color(stainless));
p.part('service-clip-0-2', box(24, 20, 46, true).translate(-504, -52, 498.2).scale(scale).color(stainless));
p.part('service-clip-1-0', box(24, 20, 46, true).translate(-336, -52, 224.6).scale(scale).color(stainless));
p.part('service-clip-1-1', box(24, 20, 46, true).translate(-336, -52, 361.4).scale(scale).color(stainless));
p.part('service-clip-1-2', box(24, 20, 46, true).translate(-336, -52, 498.2).scale(scale).color(stainless));
p.part('service-clip-2-0', box(24, 20, 46, true).translate(-168, -52, 224.6).scale(scale).color(stainless));
p.part('service-clip-2-1', box(24, 20, 46, true).translate(-168, -52, 361.4).scale(scale).color(stainless));
p.part('service-clip-2-2', box(24, 20, 46, true).translate(-168, -52, 498.2).scale(scale).color(stainless));
p.part('service-clip-3-0', box(24, 20, 46, true).translate(0, -52, 224.6).scale(scale).color(stainless));
p.part('service-clip-3-1', box(24, 20, 46, true).translate(0, -52, 361.4).scale(scale).color(stainless));
p.part('service-clip-3-2', box(24, 20, 46, true).translate(0, -52, 498.2).scale(scale).color(stainless));
p.part('service-clip-4-0', box(24, 20, 46, true).translate(168, -52, 224.6).scale(scale).color(stainless));
p.part('service-clip-4-1', box(24, 20, 46, true).translate(168, -52, 361.4).scale(scale).color(stainless));
p.part('service-clip-4-2', box(24, 20, 46, true).translate(168, -52, 498.2).scale(scale).color(stainless));
p.part('service-clip-5-0', box(24, 20, 46, true).translate(336, -52, 224.6).scale(scale).color(stainless));
p.part('service-clip-5-1', box(24, 20, 46, true).translate(336, -52, 361.4).scale(scale).color(stainless));
p.part('service-clip-5-2', box(24, 20, 46, true).translate(336, -52, 498.2).scale(scale).color(stainless));
p.part('service-clip-6-0', box(24, 20, 46, true).translate(504, -52, 224.6).scale(scale).color(stainless));
p.part('service-clip-6-1', box(24, 20, 46, true).translate(504, -52, 361.4).scale(scale).color(stainless));
p.part('service-clip-6-2', box(24, 20, 46, true).translate(504, -52, 498.2).scale(scale).color(stainless));
p.part('support-bracket--480-0', box(55, 160, 28, true).translate(-480, 80, 316.4).scale(scale).color(steel));
p.part('support-bracket-480-0', box(55, 160, 28, true).translate(480, 80, 316.4).scale(scale).color(steel));

return p.model();
