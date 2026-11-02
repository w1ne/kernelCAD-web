// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly bench service pegboard scene prop, modeled from scratch.
meta({
  name: 'bench-service-pegboard',
  license: 'CC0-1.0',
  title: 'Bench service pegboard',
  description: 'Raised laboratory bench backboard with a perforated-looking panel, rails and utility clips. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('bench-service-pegboard');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('backplate', box(1200, 80, 720, true).translate(0, 0, 360), body);
add('top-rail', box(1248, 18, 70, true).translate(0, -49.6, 720), accent);
add('bottom-rail', box(1248, 18, 70, true).translate(0, -49.6, 70), accent);
add('service-clip-0-0', box(24, 20, 46, true).translate(-504, -52, 224.6), accent);
add('service-clip-0-1', box(24, 20, 46, true).translate(-504, -52, 361.4), accent);
add('service-clip-0-2', box(24, 20, 46, true).translate(-504, -52, 498.2), accent);
add('service-clip-1-0', box(24, 20, 46, true).translate(-336, -52, 224.6), accent);
add('service-clip-1-1', box(24, 20, 46, true).translate(-336, -52, 361.4), accent);
add('service-clip-1-2', box(24, 20, 46, true).translate(-336, -52, 498.2), accent);
add('service-clip-2-0', box(24, 20, 46, true).translate(-168, -52, 224.6), accent);
add('service-clip-2-1', box(24, 20, 46, true).translate(-168, -52, 361.4), accent);
add('service-clip-2-2', box(24, 20, 46, true).translate(-168, -52, 498.2), accent);
add('service-clip-3-0', box(24, 20, 46, true).translate(0, -52, 224.6), accent);
add('service-clip-3-1', box(24, 20, 46, true).translate(0, -52, 361.4), accent);
add('service-clip-3-2', box(24, 20, 46, true).translate(0, -52, 498.2), accent);
add('service-clip-4-0', box(24, 20, 46, true).translate(168, -52, 224.6), accent);
add('service-clip-4-1', box(24, 20, 46, true).translate(168, -52, 361.4), accent);
add('service-clip-4-2', box(24, 20, 46, true).translate(168, -52, 498.2), accent);
add('service-clip-5-0', box(24, 20, 46, true).translate(336, -52, 224.6), accent);
add('service-clip-5-1', box(24, 20, 46, true).translate(336, -52, 361.4), accent);
add('service-clip-5-2', box(24, 20, 46, true).translate(336, -52, 498.2), accent);
add('service-clip-6-0', box(24, 20, 46, true).translate(504, -52, 224.6), accent);
add('service-clip-6-1', box(24, 20, 46, true).translate(504, -52, 361.4), accent);
add('service-clip-6-2', box(24, 20, 46, true).translate(504, -52, 498.2), accent);
add('support-bracket--480-0', box(55, 160, 28, true).translate(-480, 80, 316.4), accent);
add('support-bracket-480-0', box(55, 160, 28, true).translate(480, 80, 316.4), accent);

return p.model();
