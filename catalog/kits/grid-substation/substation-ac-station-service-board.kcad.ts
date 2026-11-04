// AC station service board: Multi-bay station board with separate incoming and outgoing panel sections. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-ac-station-service-board",
  license: "CC0-1.0",
  title: "AC station service board",
  description: "Multi-bay station board with separate incoming and outgoing panel sections. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
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
const p = assembly("substation-ac-station-service-board");

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

p.part("plinth", beveledPlate(1900, 820, 220, 49.20).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(1748, 1990, 705.20, 104.88).translate(0, 352.60, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(1976, 836.40, 140, 50.18).translate(0, 0, 2210).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(351.12, 1692, 75, 21.07).translate(-598.50, -323.30, 329).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 305.50, true).translate(-486.78, -385.40, 1210.25).scale(scale).color(stainlessSteel));
p.part("front-panel-2", beveledPanel(351.12, 1692, 75, 21.07).translate(-199.50, -323.30, 329).scale(scale).color(powderCoat));
p.part("handle-2", box(45, 75, 305.50, true).translate(-87.78, -385.40, 1210.25).scale(scale).color(stainlessSteel));
p.part("front-panel-3", beveledPanel(351.12, 1692, 75, 21.07).translate(199.50, -323.30, 329).scale(scale).color(powderCoat));
p.part("handle-3", box(45, 75, 305.50, true).translate(311.22, -385.40, 1210.25).scale(scale).color(stainlessSteel));
p.part("front-panel-4", beveledPanel(351.12, 1692, 75, 21.07).translate(598.50, -323.30, 329).scale(scale).color(powderCoat));
p.part("handle-4", box(45, 75, 305.50, true).translate(710.22, -385.40, 1210.25).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(874, 262.40, 150, true).translate(0, 135.30, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(627, -428, 1833).scale(scale).color(signalAmber));

return p.model();
