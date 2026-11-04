// Control room console: Operator desk with three raised instrument panels and a continuous work surface. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-control-room-console",
  license: "CC0-1.0",
  title: "Control room console",
  description: "Operator desk with three raised instrument panels and a continuous work surface. Material controls: powder-coated steel, stainless steel, glass; finish presets: weathered and maintenance.",
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
const glass = param('glass', '#4d929b', { label: 'Glass' });
presets({
  weathered: { powderCoat: '#586b63', stainlessSteel: '#9da4a0', glass: '#52888c' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-control-room-console");

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

p.part("console-base", beveledPlate(2236, 750, 696, 45).translate(0, 75, 0).scale(scale).color(powderCoat));
p.part("worktop", beveledPlate(2600, 1250, 150, 75).translate(0, -50, 696).scale(scale).color(stainlessSteel));
p.part("instrument-pedestal-1", box(676, 287.50, 362.50, true).translate(-754, 143.75, 1094.75).scale(scale).color(powderCoat));
p.part("display-panel-1", beveledPanel(624, 261, 100, 15.66).translate(-754, 175, 1189).scale(scale).color(glass));
p.part("instrument-pedestal-2", box(676, 287.50, 362.50, true).translate(0, 143.75, 1094.75).scale(scale).color(powderCoat));
p.part("display-panel-2", beveledPanel(624, 261, 100, 15.66).translate(0, 175, 1189).scale(scale).color(glass));
p.part("instrument-pedestal-3", box(676, 287.50, 362.50, true).translate(754, 143.75, 1094.75).scale(scale).color(powderCoat));
p.part("display-panel-3", beveledPanel(624, 261, 100, 15.66).translate(754, 175, 1189).scale(scale).color(glass));

return p.model();
