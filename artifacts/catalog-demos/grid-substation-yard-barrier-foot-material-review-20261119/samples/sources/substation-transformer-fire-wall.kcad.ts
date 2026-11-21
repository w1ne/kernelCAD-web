// Transformer fire wall: Segmented fire separation wall on steel feet beside a transformer bay. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-transformer-fire-wall",
  license: "CC0-1.0",
  title: "Transformer fire wall",
  description: "Segmented fire separation wall on steel feet beside a transformer bay. Material controls: concrete, galvanized steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
presets({
  weathered: { concrete: '#88887f', galvanizedSteel: '#778080' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-transformer-fire-wall");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("panel-1", box(1560, 500, 4136, true).translate(-2280, 0, 2318).scale(scale).color(concrete));
p.part("panel-foot-1", box(1680, 700, 250, true).translate(-2280, 0, 125).scale(scale).color(galvanizedSteel));
p.part("panel-2", box(1560, 500, 4136, true).translate(780, 0, 2318).scale(scale).color(concrete));
p.part("panel-foot-2", box(1680, 700, 250, true).translate(780, 0, 125).scale(scale).color(galvanizedSteel));
p.part("panel-3", box(1560, 500, 4136, true).translate(3840, 0, 2318).scale(scale).color(concrete));
p.part("panel-foot-3", box(1680, 700, 250, true).translate(3840, 0, 125).scale(scale).color(galvanizedSteel));
p.part("panel-4", box(1560, 500, 4136, true).translate(6900, 0, 2318).scale(scale).color(concrete));
p.part("panel-foot-4", box(1680, 700, 250, true).translate(6900, 0, 125).scale(scale).color(galvanizedSteel));
p.part("top-cap", beveledPlate(6000, 540, 150, 32.40).translate(0, 0, 4550).scale(scale).color(galvanizedSteel));

return p.model();
