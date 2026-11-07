// Tap changer drive cabinet: Weatherproof drive cabinet with a roof hood, double doors, and a low cable plinth. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-tap-changer-drive-cabinet",
  license: "CC0-1.0",
  title: "Tap changer drive cabinet",
  description: "Weatherproof drive cabinet with a roof hood, double doors, and a low cable plinth. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
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
const p = assembly("substation-tap-changer-drive-cabinet");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);
const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);

p.part("plinth", beveledPlate(1100, 900, 220, 54).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(1012, 1840, 774, 60.72).translate(0, 387, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(1144, 918, 140, 55.08).translate(0, 0, 2060).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(406.56, 1584, 75, 24.39).translate(-231, -358.50, 308).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 286, true).translate(-101.64, -423, 1133).scale(scale).color(stainlessSteel));
p.part("front-panel-2", beveledPanel(406.56, 1584, 75, 24.39).translate(231, -358.50, 308).scale(scale).color(powderCoat));
p.part("handle-2", box(45, 75, 286, true).translate(360.36, -423, 1133).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(506, 288, 150, true).translate(0, 148.50, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(363, -468, 1716).scale(scale).color(signalAmber));

return p.model();
