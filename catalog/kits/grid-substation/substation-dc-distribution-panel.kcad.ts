// DC distribution panel: Wide panel with grouped feeder doors and a raised cable-entry base. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-dc-distribution-panel",
  license: "CC0-1.0",
  title: "DC distribution panel",
  description: "Wide panel with grouped feeder doors and a raised cable-entry base. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
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
const p = assembly("substation-dc-distribution-panel");

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

p.part("plinth", beveledPlate(1600, 780, 220, 46.80).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("cabinet-body", beveledPanel(1472, 1840, 670.80, 88.32).translate(0, 335.40, 220).scale(scale).color(powderCoat));
p.part("rain-hood", beveledPlate(1664, 795.60, 140, 47.74).translate(0, 0, 2060).scale(scale).color(powderCoat));
p.part("front-panel-1", beveledPanel(295.68, 1584, 75, 17.74).translate(-504, -305.70, 308).scale(scale).color(powderCoat));
p.part("handle-1", box(45, 75, 286, true).translate(-409.92, -366.60, 1133).scale(scale).color(stainlessSteel));
p.part("front-panel-2", beveledPanel(295.68, 1584, 75, 17.74).translate(-168, -305.70, 308).scale(scale).color(powderCoat));
p.part("handle-2", box(45, 75, 286, true).translate(-73.92, -366.60, 1133).scale(scale).color(stainlessSteel));
p.part("front-panel-3", beveledPanel(295.68, 1584, 75, 17.74).translate(168, -305.70, 308).scale(scale).color(powderCoat));
p.part("handle-3", box(45, 75, 286, true).translate(262.08, -366.60, 1133).scale(scale).color(stainlessSteel));
p.part("front-panel-4", beveledPanel(295.68, 1584, 75, 17.74).translate(504, -305.70, 308).scale(scale).color(powderCoat));
p.part("handle-4", box(45, 75, 286, true).translate(598.08, -366.60, 1133).scale(scale).color(stainlessSteel));
p.part("cable-entry-plinth", box(736, 249.60, 150, true).translate(0, 128.70, 75).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(528, -408, 1716).scale(scale).color(signalAmber));

return p.model();
