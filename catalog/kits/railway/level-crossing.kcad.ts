// Road crossing over a short rail section with two road panels, flangeway grooves and warning posts.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "level-crossing",
  license: 'CC0-1.0',
  title: "Railway level crossing",
  description: "Road crossing over a short rail section with two road panels, flangeway grooves and warning posts. Editable material controls: road asphalt, rail and running gear steel, high-visibility paint. Includes weathered and fresh service presets.",
  tags: ["level crossing", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const asphalt = param('asphalt', '#4e5558', { label: 'Road asphalt' });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const safetyPaint = param('safetyPaint', '#e7b735', { label: 'High-visibility paint' });
presets({
  weathered: { asphalt: '#575a58', railSteel: '#666a6a', safetyPaint: '#c7a13f' },
  freshService: { asphalt: '#555c5e', railSteel: '#56636a', safetyPaint: '#f5c521' },
});
const p = assembly("level-crossing");
p.part("road", box(760,900,48,true).translate(0,0,24).scale(scale).translate(0, 0, 0).color(asphalt));
p.part("rail-left", box(1500,34,52,true).translate(0,-84,56).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("rail-right", box(1500,34,52,true).translate(0,84,56).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("road-panel-left", box(600,250,25,true).translate(0,-210,60).scale(scale).translate(0, 0, 0).color(asphalt));
p.part("road-panel-right", box(600,250,25,true).translate(0,210,60).scale(scale).translate(0, 0, 0).color(asphalt));
p.part("warning-post-left", box(44,44,550,true).translate(-440,-320,300).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("warning-post-right", box(44,44,550,true).translate(440,320,300).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("crossbar-left", box(360,32,32,true).translate(-440,-320,550).scale(scale).translate(0, 0, 0).color(safetyPaint));
p.part("crossbar-right", box(360,32,32,true).translate(440,320,550).scale(scale).translate(0, 0, 0).color(safetyPaint));

return p.model();
