// Two-wheel station baggage trolley with a broad load plate, push handle and raised side rails.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "baggage-cart",
  license: 'CC0-1.0',
  title: "Station baggage cart",
  description: "Two-wheel station baggage trolley with a broad load plate, push handle and raised side rails. Editable material controls: painted steel, stainless steel, rubber. Includes weathered and fresh service presets.",
  tags: ["baggage cart", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#62594d', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#b8c1c2', { label: 'Stainless steel' });
const rubber = param('rubber', '#30363a', { label: 'Rubber' });
presets({
  weathered: { paintedSteel: '#665d50', stainlessSteel: '#a5a9a6', rubber: '#414342' },
  freshService: { paintedSteel: '#b74734', stainlessSteel: '#cad2d1', rubber: '#272e32' },
});
const p = assembly("baggage-cart");
p.part("base", box(520,360,46,true).translate(0,0,150).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("upright-left", box(28,34,520,true).translate(-240,150,430).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("upright-right", box(28,34,520,true).translate(240,150,430).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("top-rail", box(520,34,30,true).translate(0,150,690).scale(scale).translate(0, 0, 0).color(stainlessSteel));
p.part("side-left", box(28,290,220,true).translate(-240,0,275).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("side-right", box(28,290,220,true).translate(240,0,275).scale(scale).translate(0, 0, 0).color(paintedSteel));
p.part("wheel-left", cylinder(36,110,12).rotate([1,0,0],90).translate(-240,-188,110).scale(scale).translate(0, 0, 0).color(rubber));
p.part("wheel-right", cylinder(36,110,12).rotate([1,0,0],90).translate(240,-188,110).scale(scale).translate(0, 0, 0).color(rubber));
p.part("handle", box(420,34,36,true).translate(0,150,710).scale(scale).translate(0, 0, 0).color(paintedSteel));

return p.model();
