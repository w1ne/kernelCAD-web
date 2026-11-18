// SPDX-License-Identifier: CC0-1.0
// Protective coat form with raised collar, sleeves, front closure and reflective bands. Material controls: turnout fabric, reflective tape, sleeve and pocket fabric, closures and hardware; weathered and highVisibility presets.
meta({
  name: "firefighter-turnout-coat",
  license: 'CC0-1.0',
  title: "Firefighter turnout coat",
  description: "Protective coat form with raised collar, sleeves, front closure and reflective bands. Material controls: turnout fabric, reflective tape, sleeve and pocket fabric, closures and hardware; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const turnoutFabricColor = param('turnoutFabricColor', '#bd702f', { label: 'Turnout fabric' });
const reflectiveTapeColor = param('reflectiveTapeColor', '#e7d65a', { label: 'Reflective tape' });
const sleeveFabricColor = param('sleeveFabricColor', '#a95f2d', { label: 'Sleeve and pocket fabric' });
const hardwareColor = param('hardwareColor', '#aeb8ba', { label: 'Closures and hardware' });
presets({
  weathered: { turnoutFabricColor: '#82543b', reflectiveTapeColor: '#b9aa55', sleeveFabricColor: '#744a34', hardwareColor: '#858e90' },
  highVisibility: { turnoutFabricColor: '#d88727', reflectiveTapeColor: '#f4eb72', sleeveFabricColor: '#c97827', hardwareColor: '#c7c9b8' },
});
const p = assembly("firefighter-turnout-coat");
const groundOffset = -260;
const add = (name, shape, finish = turnoutFabricColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
const coatProfile = (width: number, depth: number, corner: number) => path()
  .moveTo(-width / 2 + corner, -depth / 2).lineTo(width / 2 - corner, -depth / 2)
  .lineTo(width / 2, -depth / 2 + corner).lineTo(width / 2, depth / 2 - corner)
  .lineTo(width / 2 - corner, depth / 2).lineTo(-width / 2 + corner, depth / 2)
  .lineTo(-width / 2, depth / 2 - corner).lineTo(-width / 2, -depth / 2 + corner).close();
const coatTorso = coatProfile(430, 235, 44).loft(
  [coatProfile(490, 250, 48), coatProfile(448, 230, 42)],
  { planes: [
    { plane: 'XY' as const, origin: [0, 0, 300] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, 540] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, 870] as [number, number, number] },
  ], ruled: true },
);
add("coat-torso", coatTorso, turnoutFabricColor);
add("raised-collar", box(290, 245, 110, true).translate(0, 0, 650), reflectiveTapeColor);
add("coat-sleeve--1", box(450, 130, 130, true).rotateY(-35).translate(-400, 0, 730), sleeveFabricColor);
add("coat-sleeve-1", box(450, 130, 130, true).rotateY(35).translate(400, 0, 730), sleeveFabricColor);
add("coat-reflective-band-260", box(505, 260, 30, true).translate(0, 0, 275), reflectiveTapeColor);
add("coat-reflective-band-370", box(505, 260, 30, true).translate(0, 0, 385), reflectiveTapeColor);
add("coat-reflective-band-480", box(505, 260, 30, true).translate(0, 0, 495), reflectiveTapeColor);
add("front-closure", box(35, 28, 420, true).translate(235, 0, 520), hardwareColor);

add("coat-pocket-left", box(112, 18, 88, true).translate(-125, -137, 540), sleeveFabricColor);
add("coat-pocket-right", box(112, 18, 88, true).translate(125, -137, 540), sleeveFabricColor);
add("coat-cuff-left", box(62, 150, 148, true).rotateY(-35).translate(-568, 0, 600), reflectiveTapeColor);
add("coat-cuff-right", box(62, 150, 148, true).rotateY(35).translate(568, 0, 600), reflectiveTapeColor);
add("coat-zipper-pull", box(28, 22, 38, true).translate(235, -148, 505), hardwareColor);

return p.model();
