// Protection relay rack: Open relay rack with four shelves and a row of modular relay units. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-protection-relay-rack",
  license: "CC0-1.0",
  title: "Protection relay rack",
  description: "Open relay rack with four shelves and a row of modular relay units. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const signalAmber = param('signalAmber', '#f39c36', { label: 'Signal amber' });
presets({
  weathered: { powderCoat: '#586b63', stainlessSteel: '#9da4a0', signalAmber: '#c98b40' },
  maintenance: { signalAmber: '#ffc04d' },
});
const p = assembly("substation-protection-relay-rack");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("rack-base", beveledPlate(1200, 800, 180, 48).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("left-rail", box(120, 120, 2070, true).translate(-468, 0, 1215).scale(scale).color(stainlessSteel));
p.part("right-rail", box(120, 120, 2070, true).translate(468, 0, 1215).scale(scale).color(stainlessSteel));
p.part("shelf-1", beveledPlate(984, 800, 90, 48).translate(0, 0, 260).scale(scale).color(stainlessSteel));
p.part("relay-module-1", box(660, 576, 160, true).translate(0, 0, 430).scale(scale).color(stainlessSteel));
p.part("shelf-2", beveledPlate(984, 800, 90, 48).translate(0, 0, 610).scale(scale).color(stainlessSteel));
p.part("relay-module-2", box(660, 576, 160, true).translate(0, 0, 780).scale(scale).color(stainlessSteel));
p.part("shelf-3", beveledPlate(984, 800, 90, 48).translate(0, 0, 960).scale(scale).color(stainlessSteel));
p.part("relay-module-3", box(660, 576, 160, true).translate(0, 0, 1130).scale(scale).color(stainlessSteel));
p.part("shelf-4", beveledPlate(984, 800, 90, 48).translate(0, 0, 1310).scale(scale).color(stainlessSteel));
p.part("relay-module-4", box(660, 576, 160, true).translate(0, 0, 1480).scale(scale).color(stainlessSteel));
p.part("shelf-5", beveledPlate(984, 800, 90, 48).translate(0, 0, 1660).scale(scale).color(stainlessSteel));
p.part("relay-module-5", box(660, 576, 160, true).translate(0, 0, 1830).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(396, -418, 1755).scale(scale).color(signalAmber));

return p.model();
