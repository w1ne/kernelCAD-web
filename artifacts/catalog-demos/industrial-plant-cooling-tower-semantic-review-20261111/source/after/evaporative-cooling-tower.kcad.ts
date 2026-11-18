// SPDX-License-Identifier: CC0-1.0
// Induced-draft evaporative cooling tower with a broad basin and necked shell.
// What makes it one: the drift shell narrows through its throat, then opens to a
// fan deck carrying two axial rotors with broad, four-blade fans.
meta({
  name: 'evaporative-cooling-tower',
  license: 'CC0-1.0',
  title: 'Evaporative cooling tower',
  description: 'Induced-draft evaporative cooling tower with a broad basin, necked drift shell, throat ring and top fan deck carrying two four-blade axial rotors inside raised shrouds. Controls: overall scale, structural steel, safety paint and fan blades.',
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
const fanBlades = param('fanBlades', '#c0c9cb', { label: 'Axial fan blades' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', fanBlades: '#858e90' },
  highVisibility: { safetyPaint: '#f5c640', fanBlades: '#d5dcdd' },
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
p.part('fan-shroud-0', cylinder(72, 116, 16).translate(-121, 0, 918).subtract(cylinder(74, 106, 16).translate(-121, 0, 917)).scale(scale).color(safetyPaint));
p.part('fan-hub-0', cylinder(50, 38, 12).translate(-121, 0, 936).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('fan-shroud-1', cylinder(72, 116, 16).translate(121, 0, 918).subtract(cylinder(74, 106, 16).translate(121, 0, 917)).scale(scale).color(safetyPaint));
p.part('fan-hub-1', cylinder(50, 38, 12).translate(121, 0, 936).translate(0, 0, 0.5).scale(scale).color(steel));
const fanBladeProfile = [[21, -12], [47, -19], [78, -17], [99, -8], [100, 2], [78, 12], [47, 14], [25, 6]];
for (const [fan, x] of [[0, -121], [1, 121]] as const) {
  for (let blade = 0; blade < 4; blade++) {
    p.part(
      `fan-blade-${fan}-${blade}`,
      extrudePolygon(fanBladeProfile, 8).rotateZ(blade * 90).translate(x, 0, 979).scale(scale).color(fanBlades),
    );
  }
}
p.part('basin-leg-0', box(36, 36, 105, true).translate(-231.2, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('basin-leg-1', box(36, 36, 105, true).translate(-81.6, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('basin-leg-2', box(36, 36, 105, true).translate(68, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));
p.part('basin-leg-3', box(36, 36, 105, true).translate(217.6, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(steel));

return p.model();
