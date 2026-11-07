// Rail lumber wagon with a flat deck, tall end stakes and a layered timber cargo stack.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "lumber-wagon",
  license: 'CC0-1.0',
  title: "Lumber wagon",
  description: "Rail lumber wagon with a flat deck, tall end stakes and a layered timber cargo stack. Editable material controls: rail and running gear steel, timber, painted steel. Includes weathered and fresh service presets.",
  tags: ["lumber wagon", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const timber = param('timber', '#8b6643', { label: 'Timber' });
const paintedSteel = param('paintedSteel', '#72583e', { label: 'Painted steel' });
presets({
  weathered: { railSteel: '#666a6a', timber: '#846649', paintedSteel: '#715c45' },
  freshService: { railSteel: '#56636a', timber: '#9b7146', paintedSteel: '#b74734' },
});
const p = assembly("lumber-wagon");
p.part("underframe", box(1460,300,82,true).translate(0,0,150).scale(scale).translate(0, 0, 4).color(railSteel));
p.part("deck", box(1480,320,54,true).translate(0,0,218).scale(scale).translate(0, 0, 4).color(timber));
p.part("end-stake-left", box(34,330,390,true).translate(-680,0,430).scale(scale).translate(0, 0, 4).color(paintedSteel));
p.part("end-stake-right", box(34,330,390,true).translate(680,0,430).scale(scale).translate(0, 0, 4).color(paintedSteel));
p.part("log-1", cylinder(1240,52,10).rotate([0,1,0],90).translate(-620,-95,302).scale(scale).translate(0, 0, 4).color(timber));
p.part("log-2", cylinder(1240,52,10).rotate([0,1,0],90).translate(-620,0,302).scale(scale).translate(0, 0, 4).color(timber));
p.part("log-3", cylinder(1240,52,10).rotate([0,1,0],90).translate(-620,95,302).scale(scale).translate(0, 0, 4).color(timber));
p.part("log-4", cylinder(1240,52,10).rotate([0,1,0],90).translate(-620,-50,398).scale(scale).translate(0, 0, 4).color(timber));
p.part("log-5", cylinder(1240,52,10).rotate([0,1,0],90).translate(-620,50,398).scale(scale).translate(0, 0, 4).color(timber));
p.part("wheel-a", cylinder(30,78,12).rotate([1,0,0],90).translate(-500,-170,74).scale(scale).translate(0, 0, 4).color(railSteel));
p.part("wheel-b", cylinder(30,78,12).rotate([1,0,0],90).translate(500,-170,74).scale(scale).translate(0, 0, 4).color(railSteel));

return p.model();
