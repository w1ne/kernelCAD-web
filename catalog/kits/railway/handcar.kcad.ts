// Four-wheel railway handcar with wheels set against its frame, a plank platform, upright pump handle and two operator grips.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "handcar",
  license: 'CC0-1.0',
  title: "Railway handcar",
  description: "Four-wheel railway handcar with wheels set against its frame, a plank platform, upright pump handle and two operator grips. Editable material controls: timber, painted steel, rail and running gear steel, rubber. Includes weathered and fresh service presets.",
  tags: ["handcar", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param('timber', '#8b6643', { label: 'Timber' });
const paintedSteel = param('paintedSteel', '#70543c', { label: 'Painted steel' });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const rubber = param('rubber', '#30363a', { label: 'Rubber' });
presets({
  weathered: { timber: '#846649', paintedSteel: '#705944', railSteel: '#666a6a', rubber: '#414342' },
  freshService: { timber: '#9b7146', paintedSteel: '#b74734', railSteel: '#56636a', rubber: '#272e32' },
});
const p = assembly("handcar");
p.part("platform", box(520,300,60,true).translate(0,0,220).scale(scale).translate(0, 0, 0).color(timber));
p.part("frame", box(560,60,56,true).translate(0,0,166).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("wheel-left-front", cylinder(28,80,12).rotate([1,0,0],90).translate(-210,-170,80).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("wheel-left-back", cylinder(28,80,12).rotate([1,0,0],90).translate(210,-170,80).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("wheel-right-front", cylinder(28,80,12).rotate([1,0,0],90).translate(-210,142,80).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("wheel-right-back", cylinder(28,80,12).rotate([1,0,0],90).translate(210,142,80).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("pump-post", box(28,32,300,true).translate(0,0,400).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("pump-arm", box(370,32,28,true).translate(0,0,554).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("grip-left", cylinder(95,20,8).rotate([0,1,0],90).translate(-185,0,554).scale(scale).translate(0, 0, 0).color(rubber));
p.part("grip-right", cylinder(95,20,8).rotate([0,1,0],90).translate(185,0,554).scale(scale).translate(0, 0, 0).color(rubber));

return p.model();
