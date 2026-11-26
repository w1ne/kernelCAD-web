// SPDX-License-Identifier: CC0-1.0
// Skid-mounted site-water scene prop with a moulded fill neck, separate screw
// cap and drain valve. The polyethylene shell, polypropylene cap and galvanised
// steel support distinguish the vessel from painted site equipment.
meta({
  name: "portable-site-water-tank",
  license: 'CC0-1.0',
  title: "Portable site water tank",
  description: "Skid-mounted site water tank with a moulded fill neck, screw cap and drain valve. Material controls: polyethylene shell, polypropylene filler cap, galvanised skid steel; siteBlue and weatheredPolyethylene presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const tankPolyethyleneColor = param('tankPolyethyleneColor', '#e7ecee', { label: 'Polyethylene tank shell' });
const polypropyleneCapColor = param('polypropyleneCapColor', '#20262a', { label: 'Polypropylene filler cap' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Galvanised skid and valve steel' });
presets({
  siteBlue: {
    tankPolyethyleneColor: '#3f7fb5',
    polypropyleneCapColor: '#1d2327',
    structuralSteelColor: '#7d8b90',
  },
  weatheredPolyethylene: {
    tankPolyethyleneColor: '#cfd6d2',
    polypropyleneCapColor: '#2b2d2c',
    structuralSteelColor: '#716b61',
  },
});
const p = assembly('portable-site-water-tank');
const add = (name, shape, finish = tankPolyethyleneColor) =>
  p.part(name, shape.scale(scale).color(finish));
add('skid-base', box(846, 653.6, 65, true).translate(0, 0, 32.5), structuralSteelColor);
add('tank-body', box(733.2, 562.4, 900, true).translate(0, 0, 515), tankPolyethyleneColor);
add('filler-neck', cylinder(100, 48, 8).translate(-263.2, 0, 965), tankPolyethyleneColor);
add('filler-cap', cylinder(14, 60, 8).translate(-263.2, 0, 1064), polypropyleneCapColor);
add('outlet-valve', cylinder(125, 34, 8).translate(394.8, 0, 425), structuralSteelColor);
add('tank-skid--1', box(902.4, 35, 82, true).translate(0, -296.4, 41), structuralSteelColor);
add('tank-skid-1', box(902.4, 35, 82, true).translate(0, 296.4, 41), structuralSteelColor);

return p.model();
