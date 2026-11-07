// Volleyball: Panelled volleyball with contrasting curved seam bands that divide its soft spherical cover. Low-poly sports prop in millimetres, Z up; materials: ball panel fabric, seam tape, panel accent fabric.
meta({
  name: 'volleyball',
  license: 'CC0-1.0',
  title: 'Volleyball',
  description: "Panelled volleyball with contrasting curved seam bands that divide its soft spherical cover. Material controls: ball panel fabric, seam tape, panel accent fabric.",
  tags: ['volleyball', 'ball', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const panelFabric = param('panelFabric', '#e7e2d6', { label: 'Ball panel fabric' });
const seamTape = param('seamTape', '#3e88a5', { label: 'Seam tape' });
const panelAccent = param('panelAccent', '#d3b642', { label: 'Panel accent fabric' });
presets({ clubColors: { panelFabric: '#3976a0', seamTape: '#efe5d4' } });
const p = assembly('volleyball');
p.part('ball', sphere(58).translate(0, 0, 58).scale(scale).color(panelFabric));


// Two soft raised seam rings divide the pale fabric cover into broad panels.
p.part("panel-channel-a", torus(57.8, 0.65, 12).translate(0, 0, 58).color(seamTape));
p.part("panel-channel-b", torus(57.8, 0.4, 12).rotateX(90).translate(0, 0, 58.25).color(panelAccent));

return p.model();
