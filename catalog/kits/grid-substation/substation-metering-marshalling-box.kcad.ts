// Metering marshalling box: Compact instrument junction enclosure with a rain hood and cable gland plate. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-metering-marshalling-box",
  license: "CC0-1.0",
  title: "Metering marshalling box",
  description: "Compact instrument junction enclosure with a rain hood and cable gland plate. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
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
const p = assembly("substation-metering-marshalling-box");

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

p.part("plinth", beveledPlate(980, 760, 220, 45.60).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(901.60, 1140, 653.60, 54.10).translate(0, 326.80, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(1019.20, 775.20, 140, 46.51).translate(0, 0, 1360).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(724.42, 1080, 75, 43.47).translate(0, -296.90, 210).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 195, true).translate(230.50, -357.20, 772.50).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(450.80, 243.20, 150, true).translate(0, 125.40, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(323.40, -398, 1170).scale(scale).color(signalAmber));

return p.model();
