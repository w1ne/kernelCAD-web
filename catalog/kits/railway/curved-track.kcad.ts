// Closed circular railway track loop with twin concentric rails, radial sleepers and a low ballast ring.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "curved-track",
  license: 'CC0-1.0',
  title: "Curved railway track loop",
  description: "Closed circular railway track loop with twin concentric rails, radial sleepers and a low ballast ring. Editable material controls: track ballast, rail and running gear steel, concrete. Includes weathered and fresh service presets.",
  tags: ["curved track", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const ballast = param('ballast', '#706b62', { label: 'Track ballast' });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const concrete = param('concrete', '#aaa79c', { label: 'Concrete' });
presets({
  weathered: { ballast: '#706a60', railSteel: '#666a6a', concrete: '#9a968a' },
  freshService: { ballast: '#797367', railSteel: '#56636a', concrete: '#b8b4a8' },
});
const p = assembly("curved-track");
p.part("ballast-ring", cylinder(36,740,24).subtract(cylinder(38,510,24).translate(0,0,-1)).translate(0,0,0).scale(scale).translate(0, 0, 0).color(ballast));
p.part("outer-rail", cylinder(62,710,24).subtract(cylinder(64,660,24).translate(0,0,-1)).translate(0,0,40).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("inner-rail", cylinder(62,590,24).subtract(cylinder(64,540,24).translate(0,0,-1)).translate(0,0,40).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("sleeper-1", box(340,40,34,true).rotate([0,0,1],0).translate(0,-625,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-2", box(340,40,34,true).rotate([0,0,1],30).translate(312,-541,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-3", box(340,40,34,true).rotate([0,0,1],60).translate(541,-312,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-4", box(340,40,34,true).rotate([0,0,1],90).translate(625,0,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-5", box(340,40,34,true).rotate([0,0,1],120).translate(541,312,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-6", box(340,40,34,true).rotate([0,0,1],150).translate(312,541,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-7", box(340,40,34,true).rotate([0,0,1],180).translate(0,625,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-8", box(340,40,34,true).rotate([0,0,1],210).translate(-312,541,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-9", box(340,40,34,true).rotate([0,0,1],240).translate(-541,312,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-10", box(340,40,34,true).rotate([0,0,1],270).translate(-625,0,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-11", box(340,40,34,true).rotate([0,0,1],300).translate(-541,-312,38).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-12", box(340,40,34,true).rotate([0,0,1],330).translate(-312,-541,38).scale(scale).translate(0, 0, 0).color(concrete));

return p.model();
