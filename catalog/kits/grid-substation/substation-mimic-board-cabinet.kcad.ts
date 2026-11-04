// Mimic board cabinet: Wide cabinet front with a framed blank mimic panel and service doors below. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-mimic-board-cabinet",
  license: "CC0-1.0",
  title: "Mimic board cabinet",
  description: "Wide cabinet front with a framed blank mimic panel and service doors below. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
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
const p = assembly("substation-mimic-board-cabinet");

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

p.part("plinth", beveledPlate(2200, 800, 220, 48).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(2024, 1940, 688, 116.40).translate(0, 344, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(2288, 816, 140, 48.96).translate(0, 0, 2160).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(406.56, 1656, 75, 24.39).translate(-693, -314.50, 322).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 299, true).translate(-563.64, -376, 1184.50).scale(scale).color(stainlessSteel));
p.part("front-panel-2", beveledPanel(406.56, 1656, 75, 24.39).translate(-231, -314.50, 322).scale(scale).color(powderCoat));
p.part("handle-2", box(45, 75, 299, true).translate(-101.64, -376, 1184.50).scale(scale).color(stainlessSteel));
p.part("front-panel-3", beveledPanel(406.56, 1656, 75, 24.39).translate(231, -314.50, 322).scale(scale).color(powderCoat));
p.part("handle-3", box(45, 75, 299, true).translate(360.36, -376, 1184.50).scale(scale).color(stainlessSteel));
p.part("front-panel-4", beveledPanel(406.56, 1656, 75, 24.39).translate(693, -314.50, 322).scale(scale).color(powderCoat));
p.part("handle-4", box(45, 75, 299, true).translate(822.36, -376, 1184.50).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(1012, 256, 150, true).translate(0, 132, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(726, -418, 1794).scale(scale).color(signalAmber));

return p.model();
