// SPDX-License-Identifier: CC0-1.0
// Industrial cooling tower with a broad basin, tapered-looking shell and rooftop fan assembly.
meta({
  name: 'evaporative-cooling-tower',
  license: 'CC0-1.0',
  title: 'Evaporative cooling tower',
  description: 'Industrial cooling tower with a broad basin, tapered-looking shell and rooftop fan assembly. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#73838a', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dda946', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('evaporative-cooling-tower');
p.part('basin', box(680, 680, 105, true).translate(0, 0, 52).translate(0, 0, 0.5).scale(scale).color(safetyPaint));
const octagon = (radius: number) => {
  let ring = path().moveTo(radius, 0);
  for (let side = 1; side < 8; side++) {
    const angle = (2 * Math.PI * side) / 8;
    ring = ring.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return ring.close();
};
const towerShell = octagon(300).loft([octagon(225), octagon(245), octagon(285)], {
  planes: [105, 470, 780, 890].map((z) => ({
    plane: 'XY' as const,
    origin: [0, 0, z] as [number, number, number],
  })),
  ruled: true,
});
p.part('tower-shell', towerShell.scale(scale).color(steel));
p.part('throat-ring', box(482.8, 482.8, 30, true).translate(0, 0, 656.2).translate(0, 0, 0.5).scale(scale).color(safetyPaint));
p.part('drift-cap', box(516.8, 516.8, 28, true).translate(0, 0, 904).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('fan-ring-0', cylinder(30, 81.6, 12).translate(-95.2, 0, 930).translate(0, 0, 0.5).scale(scale).color(safetyPaint));
p.part('fan-hub-0', cylinder(48, 30.6, 8).translate(-95.2, 0, 950).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('fan-ring-1', cylinder(30, 81.6, 12).translate(95.2, 0, 930).translate(0, 0, 0.5).scale(scale).color(safetyPaint));
p.part('fan-hub-1', cylinder(48, 30.6, 8).translate(95.2, 0, 950).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('basin-leg-0', box(36, 36, 105, true).translate(-231.2, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('basin-leg-1', box(36, 36, 105, true).translate(-81.6, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('basin-leg-2', box(36, 36, 105, true).translate(68, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('basin-leg-3', box(36, 36, 105, true).translate(217.6, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));

return p.model();
