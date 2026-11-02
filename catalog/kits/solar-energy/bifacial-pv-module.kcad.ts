meta({
  name: 'bifacial-pv-module',
  license: 'CC0-1.0',
  title: 'Bifacial PV module',
  description: 'Double-sided framed module on an open stand with visible rear cross-bracing.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#5d7c89', { label: 'Asset color' });
const p = assembly("bifacial-pv-module");
p.part("pv-frame", box(720, 392.4, 22, true).translate(0, 0, 180).scale(scale).color(color));
p.part("pv-surface", box(702, 374.4, 22, true).translate(0, 0, 201).scale(scale).color(color));
p.part("pv-cell-bar-x-0", box(4, 354.4, 2, true).translate(-175.5, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-x-1", box(4, 354.4, 2, true).translate(0, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-x-2", box(4, 354.4, 2, true).translate(175.5, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-y-0", box(682, 4, 2, true).translate(0, -93.6, 213).scale(scale).color(color));
p.part("pv-cell-bar-y-1", box(682, 4, 2, true).translate(0, 0, 213).scale(scale).color(color));
p.part("pv-cell-bar-y-2", box(682, 4, 2, true).translate(0, 93.6, 213).scale(scale).color(color));
p.part("rack-rail-left", box(728, 22, 30, true).translate(0, -127.296, 170).scale(scale).color(color));
p.part("rack-rail-right", box(728, 22, 30, true).translate(0, 127.296, 170).scale(scale).color(color));
p.part("rack-leg-0-0", box(28, 28, 150, true).translate(-252.72, -127.296, 107).scale(scale).color(color));
p.part("rack-leg-0-1", box(28, 28, 150, true).translate(-252.72, 127.296, 107).scale(scale).color(color));
p.part("rack-leg-1-0", box(28, 28, 150, true).translate(252.72, -127.296, 107).scale(scale).color(color));
p.part("rack-leg-1-1", box(28, 28, 150, true).translate(252.72, 127.296, 107).scale(scale).color(color));
p.part("rear-crossbar", box(702, 24, 24, true).translate(0, 0, 82).scale(scale).color(color));
p.part("rear-center-brace", box(24, 24, 145, true).translate(0, 0, 98).scale(scale).color(color));

return p.model();
