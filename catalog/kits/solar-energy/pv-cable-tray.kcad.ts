meta({
  name: 'pv-cable-tray',
  license: 'CC0-1.0',
  title: 'PV cable tray section',
  description: 'Straight open cable tray with side lips, floor rungs and end splice plates.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#737e7b', { label: 'Asset color' });
const p = assembly("pv-cable-tray");
p.part("tray-floor", box(1480, 182, 18, true).translate(0, 0, 9).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-left-lip", box(1480, 20, 160, true).translate(0, -96.2, 80).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-right-lip", box(1480, 20, 160, true).translate(0, 96.2, 80).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-0", box(22, 176.8, 20, true).translate(-621.6, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-1", box(22, 176.8, 20, true).translate(-444, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-2", box(22, 176.8, 20, true).translate(-266.4, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-3", box(22, 176.8, 20, true).translate(-88.8, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-4", box(22, 176.8, 20, true).translate(88.8, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-5", box(22, 176.8, 20, true).translate(266.4, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-6", box(22, 176.8, 20, true).translate(444, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-rung-7", box(22, 176.8, 20, true).translate(621.6, 0, 20).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-end-splice--710-4", box(90, 228.8, 196, true).translate(-710.4, 0, 80).translate(0, 0, 18).scale(scale).color(color));
p.part("tray-end-splice-710-4", box(90, 228.8, 196, true).translate(710.4, 0, 80).translate(0, 0, 18).scale(scale).color(color));

return p.model();
