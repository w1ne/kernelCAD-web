// Single-axis solar tracker: Eight framed PV modules tilt together around a torque tube carried by three piers and a drive housing
meta({
  name: 'single-axis-solar-tracker',
  license: 'CC0-1.0',
  title: 'Single-axis solar tracker',
  description: 'Eight framed PV modules tilt together around a torque tube carried by three piers and a drive housing. Material controls: frame aluminum, solar glass, galvanized steel, pv cell busbars.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Frame aluminum' });
const solarGlass = param('solarGlass', '#244a68', { label: 'Solar glass' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel' });
const cellBusbar = param('cellBusbar', '#d9dedd', { label: 'PV cell busbars' });
presets({
  fieldService: { aluminum: '#a9b5b9', solarGlass: '#1e4668', galvanizedSteel: '#68787b', cellBusbar: '#e4e5df' },
  highVisibility: { aluminum: '#d4dcdf', solarGlass: '#183a5b', galvanizedSteel: '#536367', cellBusbar: '#f2f2e9' },
});
const p = assembly("single-axis-solar-tracker");
const trackerPanel = (w:number,d:number,h:number,x:number,y:number,z:number) => box(w,d,h,true).translate(x,y,z - 372.4).rotate([1,0,0],11).translate(0,0,372.4).scale(scale);
p.part("tracker-table-frame", trackerPanel(1740, 548.4, 22, 0, 0, 522).color(galvanizedSteel));
p.part("torque-tube", cylinder(1890, 32, 8).rotate([0, 1, 0], 90).translate(-945, 0, 372.4).scale(scale).color(galvanizedSteel));
p.part("tracker-pier-0", box(95, 95, 380, true).translate(-840, 0, 190).scale(scale).color(galvanizedSteel));
p.part("tracker-pier-1", box(95, 95, 380, true).translate(0, 0, 190).scale(scale).color(galvanizedSteel));
p.part("tracker-pier-2", box(95, 95, 380, true).translate(840, 0, 190).scale(scale).color(galvanizedSteel));
p.part("tracker-drive", box(170, 150, 130, true).translate(756, 0, 161.2).scale(scale).color(galvanizedSteel));

p.part("tracker-module-0-0-frame", trackerPanel(420, 254, 14, -645, -134, 539).color(aluminum));
p.part("tracker-module-0-0-surface", trackerPanel(400, 234, 4, -645, -134, 548).color(solarGlass));
p.part("tracker-module-0-0-busbar-x-0", trackerPanel(4, 234, 2, -745, -134, 550).color(cellBusbar));
p.part("tracker-module-0-0-busbar-x-1", trackerPanel(4, 234, 2, -545, -134, 550).color(cellBusbar));
p.part("tracker-module-0-0-busbar-y-0", trackerPanel(400, 4, 2, -645, -192, 550).color(cellBusbar));
p.part("tracker-module-0-0-busbar-y-1", trackerPanel(400, 4, 2, -645, -76, 550).color(cellBusbar));
p.part("tracker-module-0-1-frame", trackerPanel(420, 254, 14, -645, 134, 539).color(aluminum));
p.part("tracker-module-0-1-surface", trackerPanel(400, 234, 4, -645, 134, 548).color(solarGlass));
p.part("tracker-module-0-1-busbar-x-0", trackerPanel(4, 234, 2, -745, 134, 550).color(cellBusbar));
p.part("tracker-module-0-1-busbar-x-1", trackerPanel(4, 234, 2, -545, 134, 550).color(cellBusbar));
p.part("tracker-module-0-1-busbar-y-0", trackerPanel(400, 4, 2, -645, 76, 550).color(cellBusbar));
p.part("tracker-module-0-1-busbar-y-1", trackerPanel(400, 4, 2, -645, 192, 550).color(cellBusbar));
p.part("tracker-module-1-0-frame", trackerPanel(420, 254, 14, -215, -134, 539).color(aluminum));
p.part("tracker-module-1-0-surface", trackerPanel(400, 234, 4, -215, -134, 548).color(solarGlass));
p.part("tracker-module-1-0-busbar-x-0", trackerPanel(4, 234, 2, -315, -134, 550).color(cellBusbar));
p.part("tracker-module-1-0-busbar-x-1", trackerPanel(4, 234, 2, -115, -134, 550).color(cellBusbar));
p.part("tracker-module-1-0-busbar-y-0", trackerPanel(400, 4, 2, -215, -192, 550).color(cellBusbar));
p.part("tracker-module-1-0-busbar-y-1", trackerPanel(400, 4, 2, -215, -76, 550).color(cellBusbar));
p.part("tracker-module-1-1-frame", trackerPanel(420, 254, 14, -215, 134, 539).color(aluminum));
p.part("tracker-module-1-1-surface", trackerPanel(400, 234, 4, -215, 134, 548).color(solarGlass));
p.part("tracker-module-1-1-busbar-x-0", trackerPanel(4, 234, 2, -315, 134, 550).color(cellBusbar));
p.part("tracker-module-1-1-busbar-x-1", trackerPanel(4, 234, 2, -115, 134, 550).color(cellBusbar));
p.part("tracker-module-1-1-busbar-y-0", trackerPanel(400, 4, 2, -215, 76, 550).color(cellBusbar));
p.part("tracker-module-1-1-busbar-y-1", trackerPanel(400, 4, 2, -215, 192, 550).color(cellBusbar));
p.part("tracker-module-2-0-frame", trackerPanel(420, 254, 14, 215, -134, 539).color(aluminum));
p.part("tracker-module-2-0-surface", trackerPanel(400, 234, 4, 215, -134, 548).color(solarGlass));
p.part("tracker-module-2-0-busbar-x-0", trackerPanel(4, 234, 2, 115, -134, 550).color(cellBusbar));
p.part("tracker-module-2-0-busbar-x-1", trackerPanel(4, 234, 2, 315, -134, 550).color(cellBusbar));
p.part("tracker-module-2-0-busbar-y-0", trackerPanel(400, 4, 2, 215, -192, 550).color(cellBusbar));
p.part("tracker-module-2-0-busbar-y-1", trackerPanel(400, 4, 2, 215, -76, 550).color(cellBusbar));
p.part("tracker-module-2-1-frame", trackerPanel(420, 254, 14, 215, 134, 539).color(aluminum));
p.part("tracker-module-2-1-surface", trackerPanel(400, 234, 4, 215, 134, 548).color(solarGlass));
p.part("tracker-module-2-1-busbar-x-0", trackerPanel(4, 234, 2, 115, 134, 550).color(cellBusbar));
p.part("tracker-module-2-1-busbar-x-1", trackerPanel(4, 234, 2, 315, 134, 550).color(cellBusbar));
p.part("tracker-module-2-1-busbar-y-0", trackerPanel(400, 4, 2, 215, 76, 550).color(cellBusbar));
p.part("tracker-module-2-1-busbar-y-1", trackerPanel(400, 4, 2, 215, 192, 550).color(cellBusbar));
p.part("tracker-module-3-0-frame", trackerPanel(420, 254, 14, 645, -134, 539).color(aluminum));
p.part("tracker-module-3-0-surface", trackerPanel(400, 234, 4, 645, -134, 548).color(solarGlass));
p.part("tracker-module-3-0-busbar-x-0", trackerPanel(4, 234, 2, 545, -134, 550).color(cellBusbar));
p.part("tracker-module-3-0-busbar-x-1", trackerPanel(4, 234, 2, 745, -134, 550).color(cellBusbar));
p.part("tracker-module-3-0-busbar-y-0", trackerPanel(400, 4, 2, 645, -192, 550).color(cellBusbar));
p.part("tracker-module-3-0-busbar-y-1", trackerPanel(400, 4, 2, 645, -76, 550).color(cellBusbar));
p.part("tracker-module-3-1-frame", trackerPanel(420, 254, 14, 645, 134, 539).color(aluminum));
p.part("tracker-module-3-1-surface", trackerPanel(400, 234, 4, 645, 134, 548).color(solarGlass));
p.part("tracker-module-3-1-busbar-x-0", trackerPanel(4, 234, 2, 545, 134, 550).color(cellBusbar));
p.part("tracker-module-3-1-busbar-x-1", trackerPanel(4, 234, 2, 745, 134, 550).color(cellBusbar));
p.part("tracker-module-3-1-busbar-y-0", trackerPanel(400, 4, 2, 645, 76, 550).color(cellBusbar));
p.part("tracker-module-3-1-busbar-y-1", trackerPanel(400, 4, 2, 645, 192, 550).color(cellBusbar));

return p.model();
