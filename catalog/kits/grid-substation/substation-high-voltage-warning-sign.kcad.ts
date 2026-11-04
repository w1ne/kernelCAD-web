// High voltage warning sign: Blank warning sign plate on twin legs for a fenced high voltage yard. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-high-voltage-warning-sign",
  license: "CC0-1.0",
  title: "High voltage warning sign",
  description: "Blank warning sign plate on twin legs for a fenced high voltage yard. Material controls: galvanized steel, safety yellow, hazard black; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const safetyYellow = param('safetyYellow', '#efbd32', { label: 'Safety yellow' });
const hazardBlack = param('hazardBlack', '#20292d', { label: 'Hazard black' });
presets({
  weathered: { galvanizedSteel: '#778080', safetyYellow: '#c6a23d', hazardBlack: '#353a39' },
  maintenance: { safetyYellow: '#ffd64a' },
});
const p = assembly("substation-high-voltage-warning-sign");

const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);

p.part("post-left", box(100, 100, 1938, true).translate(-167.20, 0, 969).scale(scale).color(galvanizedSteel));
p.part("post-right", box(100, 100, 1938, true).translate(167.20, 0, 969).scale(scale).color(galvanizedSteel));
p.part("sign-plate", beveledPanel(760, 198, 120, 11.88).translate(0, 60, 1855.20).scale(scale).color(safetyYellow));
p.part("lower-brace", box(418, 100, 90, true).translate(0, 0, 1857).scale(scale).color(galvanizedSteel));

p.part("hazard-triangle-outer", path().moveTo(0, 0).lineTo(-205.20, 0)
  .lineTo(0, 162).lineTo(205.20, 0).close().extrude(12)
  .rotateX(90).translate(0, -60, 1878.96).scale(scale).color(hazardBlack));
p.part("hazard-triangle-inner", path().moveTo(0, 0).lineTo(-167.20, 0)
  .lineTo(0, 122.40).lineTo(167.20, 0).close().extrude(10)
  .rotateX(90).translate(0, -73, 1888.96).scale(scale).color(safetyYellow));
p.part("lightning-bolt", path().moveTo(-24, 104.40).lineTo(18, 61.20)
  .lineTo(-4, 61.20).lineTo(30, 21.60)
  .lineTo(-34, 68.40).lineTo(-8, 68.40).close().extrude(9)
  .rotateX(90).translate(0, -84, 1900.96).scale(scale).color(hazardBlack));

return p.model();
