// RTU and gateway cabinet: Tall automation cabinet with a communications bay, plinth, and cooling louvers. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-rtu-gateway-cabinet",
  license: "CC0-1.0",
  title: "RTU and gateway cabinet",
  description: "Tall automation cabinet with a communications bay, plinth, and cooling louvers. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
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
const p = assembly("substation-rtu-gateway-cabinet");

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

p.part("plinth", beveledPlate(1250, 900, 220, 54).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(1150, 1840, 774, 69).translate(0, 387, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(1300, 918, 140, 55.08).translate(0, 0, 2060).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(462, 1584, 75, 27.72).translate(-262.50, -358.50, 308).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 286, true).translate(-115.50, -423, 1133).scale(scale).color(stainlessSteel));
p.part("front-panel-2", beveledPanel(462, 1584, 75, 27.72).translate(262.50, -358.50, 308).scale(scale).color(powderCoat));
p.part("handle-2", box(45, 75, 286, true).translate(409.50, -423, 1133).scale(scale).color(stainlessSteel));
p.part("vent-1", box(687.50, 70, 38, true).rotateX(12).translate(0, -414, 679).scale(scale).color(stainlessSteel));
p.part("vent-2", box(687.50, 70, 38, true).rotateX(12).translate(0, -414, 751).scale(scale).color(stainlessSteel));
p.part("vent-3", box(687.50, 70, 38, true).rotateX(12).translate(0, -414, 823).scale(scale).color(stainlessSteel));
p.part("vent-4", box(687.50, 70, 38, true).rotateX(12).translate(0, -414, 895).scale(scale).color(stainlessSteel));
p.part("vent-5", box(687.50, 70, 38, true).rotateX(12).translate(0, -414, 967).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(575, 288, 150, true).translate(0, 148.50, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(412.50, -468, 1716).scale(scale).color(signalAmber));

return p.model();
