// Fiber communications cabinet: Communications enclosure with split equipment bays and overhead cable tray. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-fiber-communications-cabinet",
  license: "CC0-1.0",
  title: "Fiber communications cabinet",
  description: "Communications enclosure with split equipment bays and overhead cable tray. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
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
const p = assembly("substation-fiber-communications-cabinet");

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

p.part("plinth", beveledPlate(1050, 820, 220, 49.20).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(966, 1790, 705.20, 57.96).translate(0, 352.60, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(1092, 836.40, 140, 50.18).translate(0, 0, 2010).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(776.16, 1548, 75, 46.57).translate(0, -323.30, 301).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 279.50, true).translate(246.96, -385.40, 1107.25).scale(scale).color(stainlessSteel));
p.part("vent-1", box(577.50, 70, 38, true).rotateX(12).translate(0, -377.20, 664).scale(scale).color(stainlessSteel));
p.part("vent-2", box(577.50, 70, 38, true).rotateX(12).translate(0, -377.20, 736).scale(scale).color(stainlessSteel));
p.part("vent-3", box(577.50, 70, 38, true).rotateX(12).translate(0, -377.20, 808).scale(scale).color(stainlessSteel));
p.part("vent-4", box(577.50, 70, 38, true).rotateX(12).translate(0, -377.20, 880).scale(scale).color(stainlessSteel));
p.part("vent-5", box(577.50, 70, 38, true).rotateX(12).translate(0, -377.20, 952).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(483, 262.40, 150, true).translate(0, 135.30, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(346.50, -428, 1677).scale(scale).color(signalAmber));

return p.model();
