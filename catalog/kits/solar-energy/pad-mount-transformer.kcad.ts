meta({
  name: 'pad-mount-transformer',
  license: 'CC0-1.0',
  title: 'Pad-mount transformer',
  description: 'Ground transformer cabinet with radiator fins, lifting lugs and porcelain bushings.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#747e7a', { label: 'Asset color' });
const p = assembly("pad-mount-transformer");
p.part("transformer-pad", box(1146.8, 789.6, 76, true).translate(0, 0, 38).scale(scale).color(color));
p.part("transformer-tank", box(878.4, 546, 696, true).translate(0, 0, 464).scale(scale).color(color));
p.part("radiator-fin-front-0", box(28, 193.2, 580, true).translate(-524.6, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-0", box(28, 193.2, 580, true).translate(-524.6, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-1", box(28, 193.2, 580, true).translate(-393.45, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-1", box(28, 193.2, 580, true).translate(-393.45, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-2", box(28, 193.2, 580, true).translate(-262.3, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-2", box(28, 193.2, 580, true).translate(-262.3, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-3", box(28, 193.2, 580, true).translate(-131.15, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-3", box(28, 193.2, 580, true).translate(-131.15, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-4", box(28, 193.2, 580, true).translate(0, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-4", box(28, 193.2, 580, true).translate(0, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-5", box(28, 193.2, 580, true).translate(131.15, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-5", box(28, 193.2, 580, true).translate(131.15, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-6", box(28, 193.2, 580, true).translate(262.3, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-6", box(28, 193.2, 580, true).translate(262.3, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-7", box(28, 193.2, 580, true).translate(393.45, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-7", box(28, 193.2, 580, true).translate(393.45, -352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-front-8", box(28, 193.2, 580, true).translate(524.6, 352.8, 452.4).scale(scale).color(color));
p.part("radiator-fin-back-8", box(28, 193.2, 580, true).translate(524.6, -352.8, 452.4).scale(scale).color(color));
p.part("bushing-base-0", cylinder(46, 62, 8).translate(-268.4, 0, 823.6).scale(scale).color(color));
p.part("porcelain-bushing-0", cylinder(185.6, 38, 10).translate(-268.4, 0, 870).scale(scale).color(color));
p.part("bushing-cap-0", cylinder(32, 52, 8).translate(-268.4, 0, 1055.6).scale(scale).color(color));
p.part("bushing-base-1", cylinder(46, 62, 8).translate(0, 0, 823.6).scale(scale).color(color));
p.part("porcelain-bushing-1", cylinder(185.6, 38, 10).translate(0, 0, 870).scale(scale).color(color));
p.part("bushing-cap-1", cylinder(32, 52, 8).translate(0, 0, 1055.6).scale(scale).color(color));
p.part("bushing-base-2", cylinder(46, 62, 8).translate(268.4, 0, 823.6).scale(scale).color(color));
p.part("porcelain-bushing-2", cylinder(185.6, 38, 10).translate(268.4, 0, 870).scale(scale).color(color));
p.part("bushing-cap-2", cylinder(32, 52, 8).translate(268.4, 0, 1055.6).scale(scale).color(color));
p.part("lifting-lug-left", box(90, 588, 58, true).translate(-463.6, 0, 835.2).scale(scale).color(color));
p.part("lifting-lug-right", box(90, 588, 58, true).translate(463.6, 0, 835.2).scale(scale).color(color));

return p.model();
