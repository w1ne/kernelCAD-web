// Insulated operating stick cabinet: Long wall mounted cabinet with separate bays for insulated operating sticks. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-insulated-stick-cabinet",
  license: "CC0-1.0",
  title: "Insulated operating stick cabinet",
  description: "Long wall mounted cabinet with separate bays for insulated operating sticks. Material controls: powder-coated steel, stainless steel, insulating polymer, signal amber; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const polymer = param('polymer', '#6f91a0', { label: 'Insulating polymer' });
const signalAmber = param('signalAmber', '#f39c36', { label: 'Signal amber' });
presets({
  weathered: { powderCoat: '#586b63', stainlessSteel: '#9da4a0', polymer: '#6c838a', signalAmber: '#c98b40' },
  maintenance: { signalAmber: '#ffc04d' },
});
const p = assembly("substation-insulated-stick-cabinet");

const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);

p.part("wall-back", beveledPanel(2850, 650, 120, 39).translate(0, 154.50, 0).scale(scale).color(powderCoat));
p.part("lower-shelf", box(2850, 450, 150, true).translate(0, 0, 75).scale(scale).color(stainlessSteel));
p.part("upper-shelf", box(2850, 450, 150, true).translate(0, 0, 575).scale(scale).color(stainlessSteel));
p.part("stick-bay-1", box(95, 189, 442, true).translate(-1168.50, 0, 325).scale(scale).color(polymer));
p.part("stick-bay-2", box(95, 189, 442, true).translate(-778.05, 0, 325).scale(scale).color(polymer));
p.part("stick-bay-3", box(95, 189, 442, true).translate(-387.60, 0, 325).scale(scale).color(polymer));
p.part("stick-bay-4", box(95, 189, 442, true).translate(2.85, 0, 325).scale(scale).color(polymer));
p.part("stick-bay-5", box(95, 189, 442, true).translate(393.30, 0, 325).scale(scale).color(polymer));
p.part("stick-bay-6", box(95, 189, 442, true).translate(783.75, 0, 325).scale(scale).color(polymer));
p.part("stick-bay-7", box(95, 189, 442, true).translate(1174.20, 0, 325).scale(scale).color(polymer));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(940.50, -243, 507).scale(scale).color(signalAmber));

return p.model();
