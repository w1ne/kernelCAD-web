// Oil cooling pump skid: Skid-mounted pump and motor pair with visible suction and discharge piping. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-oil-cooling-pump-skid",
  license: "CC0-1.0",
  title: "Oil cooling pump skid",
  description: "Skid-mounted pump and motor pair with visible suction and discharge piping. Material controls: galvanized steel, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#778080', stainlessSteel: '#9da4a0' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-oil-cooling-pump-skid");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("skid-base", beveledPlate(2500, 1300, 220, 78).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("pump-housing", box(800, 598, 752.50, true).translate(-425, 0, 596.25).scale(scale).color(galvanizedSteel));
p.part("motor", cylinder(1100, 425, 10).rotateY(90).translate(-237.50, 0, 645).scale(scale).color(stainlessSteel));
p.part("coupling-guard", box(450, 650, 490, true).translate(-50, 0, 495).scale(scale).color(galvanizedSteel));
p.part("suction-pipe", box(1750, 170, 170, true).translate(-225, -344.50, 925).scale(scale).color(stainlessSteel));
p.part("discharge-pipe", box(1250, 170, 170, true).translate(-425, 292.50, 1362.50).scale(scale).color(stainlessSteel));
p.part("pipe-support", box(160, 160, 840, true).translate(-437.50, 312, 640).scale(scale).color(stainlessSteel));
p.part("pipe-support-2", box(160, 160, 840, true).translate(525, 312, 640).scale(scale).color(stainlessSteel));

return p.model();
