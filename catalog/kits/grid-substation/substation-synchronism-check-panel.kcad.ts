// Synchronism check panel: Narrow panel cabinet with a large meter window and grouped control buttons. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-synchronism-check-panel",
  license: "CC0-1.0",
  title: "Synchronism check panel",
  description: "Narrow panel cabinet with a large meter window and grouped control buttons. Material controls: powder-coated steel, glass, signal amber; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const glass = param('glass', '#4d929b', { label: 'Glass' });
const signalAmber = param('signalAmber', '#f39c36', { label: 'Signal amber' });
presets({
  weathered: { powderCoat: '#586b63', glass: '#52888c', signalAmber: '#c98b40' },
  maintenance: { signalAmber: '#ffc04d' },
});
const p = assembly("substation-synchronism-check-panel");

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

p.part("panel-plinth", beveledPlate(1600, 720, 220, 43.20).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("panel-body", beveledPanel(1520, 1770, 612, 91.20).translate(0, 306, 220).scale(scale).color(powderCoat));
p.part("panel-cap", beveledPlate(1632, 662.40, 110, 39.74).translate(0, 0, 1990).scale(scale).color(powderCoat));
p.part("meter-window", beveledPanel(768, 588, 80, 35.28).translate(0, -276.80, 1260).scale(scale).color(glass));
p.part("button-rail", box(1216, 85, 95, true).translate(0, -316.80, 761.50).scale(scale).color(signalAmber));
p.part("button-1", box(60, 80, 75, true).translate(-480, -345.60, 751.50).scale(scale).color(signalAmber));
p.part("button-2", box(60, 80, 75, true).translate(-240, -345.60, 751.50).scale(scale).color(signalAmber));
p.part("button-3", box(60, 80, 75, true).translate(0, -345.60, 751.50).scale(scale).color(signalAmber));
p.part("button-4", box(60, 80, 75, true).translate(240, -345.60, 751.50).scale(scale).color(signalAmber));
p.part("button-5", box(60, 80, 75, true).translate(480, -345.60, 751.50).scale(scale).color(signalAmber));

return p.model();
