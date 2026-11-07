// Bay identification post: Yard post carrying a blank bay identifier panel for scene layout. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-bay-identification-post",
  license: "CC0-1.0",
  title: "Bay identification post",
  description: "Yard post carrying a blank bay identifier panel for scene layout. Material controls: galvanized steel, safety yellow; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const safetyYellow = param('safetyYellow', '#efbd32', { label: 'Safety yellow' });
presets({
  weathered: { galvanizedSteel: '#778080', safetyYellow: '#c6a23d' },
  maintenance: { safetyYellow: '#ffd64a' },
});
const p = assembly("substation-bay-identification-post");

const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);

p.part("post-left", box(100, 100, 2011, true).translate(-114.40, 0, 1005.50).scale(scale).color(galvanizedSteel));
p.part("post-right", box(100, 100, 2011, true).translate(114.40, 0, 1005.50).scale(scale).color(galvanizedSteel));
p.part("sign-plate", beveledPanel(520, 231, 120, 13.86).translate(0, 60, 1914.40).scale(scale).color(safetyYellow));
p.part("lower-brace", box(286, 100, 90, true).translate(0, 0, 1909).scale(scale).color(galvanizedSteel));

return p.model();
