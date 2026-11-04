// Bay control cabinet: Outdoor bay control cabinet with paired doors and a raised sun hood. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-bay-control-cabinet",
  license: "CC0-1.0",
  title: "Bay control cabinet",
  description: "Outdoor bay control cabinet with paired doors and a raised sun hood. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
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
const p = assembly("substation-bay-control-cabinet");

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

p.part("plinth", beveledPlate(1300, 950, 220, 57).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(1196, 1940, 817, 71.76).translate(0, 408.50, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(1352, 969, 140, 58.14).translate(0, 0, 2160).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(960.96, 1656, 75, 57.66).translate(0, -380.50, 322).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 299, true).translate(305.76, -446.50, 1184.50).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(598, 304, 150, true).translate(0, 156.75, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(429, -493, 1794).scale(scale).color(signalAmber));

return p.model();
