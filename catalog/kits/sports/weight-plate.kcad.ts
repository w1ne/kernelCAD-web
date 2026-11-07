// Weight Plate: Cast-iron gym plate with a central sleeved bore and a contrasting painted weight marker. Low-poly sports prop in millimetres, Z up; materials: cast iron plate, bore sleeve steel, weight marking paint.
meta({
  name: 'weight-plate',
  license: 'CC0-1.0',
  title: 'Weight plate',
  description: "Cast-iron gym plate with a central sleeved bore and a contrasting painted weight marker. Material controls: cast iron plate, bore sleeve steel, weight marking paint.",
  tags: ['weight plate', 'weight', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const castIron = param('castIron', '#5b666b', { label: 'Cast iron plate' });
const boreSteel = param('boreSteel', '#b4bdbe', { label: 'Bore sleeve steel' });
const markingPaint = param('markingPaint', '#d5d0bf', { label: 'Weight marking paint' });
presets({ clubColors: { castIron: '#46667a', boreSteel: '#b4bdbe' } });
const p = assembly('weight-plate');
p.part('plate', cylinder(22, 82, 16).subtract(cylinder(24, 22, 12).translate(0, 0, -1)).scale(scale).color(castIron));


// The bright sleeve lines the central bore while leaving its opening clear.
p.part("bore-sleeve", cylinder(8, 21.6, 16).subtract(cylinder(9, 17.2, 16).translate(0, 0, -0.5)).translate(0, 0, 7).color(boreSteel));
p.part("weight-mark", box(24, 4, 2, true).translate(0, -73, 11).color(markingPaint));

return p.model();
