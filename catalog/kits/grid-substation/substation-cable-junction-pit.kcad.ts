// Cable junction pit: Square pull pit with a raised rim, removable cover, and four side conduit stubs. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-cable-junction-pit",
  license: "CC0-1.0",
  title: "Cable junction pit",
  description: "Square pull pit with a raised rim, removable cover, and four side conduit stubs. Material controls: concrete, galvanized steel, cable jacket; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const cableJacket = param('cableJacket', '#263d50', { label: 'Cable jacket' });
presets({
  weathered: { concrete: '#88887f', galvanizedSteel: '#778080', cableJacket: '#394852' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-cable-junction-pit");

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

p.part("pit-floor", beveledPlate(1500, 1450, 180, 87).translate(0, 0, 0).scale(scale).color(concrete));
p.part("wall-front", beveledPanel(1500, 820, 180, 49.20).translate(0, -545, 180).scale(scale).color(concrete));
p.part("wall-back", beveledPanel(1500, 820, 180, 49.20).translate(0, 725, 180).scale(scale).color(concrete));
p.part("wall-left", beveledPanel(180, 820, 1450, 10.80).translate(-660, 725, 180).scale(scale).color(concrete));
p.part("wall-right", beveledPanel(180, 820, 1450, 10.80).translate(660, 725, 180).scale(scale).color(concrete));
p.part("cover", box(1260, 1218, 130, true).translate(0, 0, 935).scale(scale).color(galvanizedSteel));
p.part("conduit-stub", box(300, 160, 180, true).translate(-750, 0, 350).scale(scale).color(cableJacket));
p.part("conduit-stub-2", box(300, 160, 180, true).translate(750, 0, 350).scale(scale).color(cableJacket));

return p.model();
