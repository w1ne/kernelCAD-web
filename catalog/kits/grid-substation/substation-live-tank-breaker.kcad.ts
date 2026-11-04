// Live tank circuit breaker: Three upright interrupter poles on a common frame with overhead terminal arms. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-live-tank-breaker",
  license: "CC0-1.0",
  title: "Live tank circuit breaker",
  description: "Three upright interrupter poles on a common frame with overhead terminal arms. Material controls: galvanized steel, powder-coated steel, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { galvanizedSteel: '#778080', powderCoat: '#586b63', copper: '#9f704a' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-live-tank-breaker");

const ngon = (r: number, sides: number) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    outline = outline.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return outline.close();
};
const taperedColumn = (height: number, radius: number, sides = 10) => {
  const profiles = [ngon(radius * 1.2, sides), ngon(radius * .72, sides)];
  return profiles[0].loft(profiles.slice(1), {
    planes: [{ plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
      { plane: 'XY' as const, origin: [0, 0, height] as [number, number, number] }],
    ruled: true,
  });
};
const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("breaker-base", beveledPlate(2600, 1100, 300, 66).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("interrupter-pole-1", taperedColumn(2652, 175, 10).translate(-754, 0, 300).scale(scale).color(powderCoat));
p.part("terminal-arm-1", box(520, 180, 150, true).translate(-754, 0, 3735).scale(scale).color(copper));
p.part("interrupter-pole-2", taperedColumn(2652, 175, 10).translate(0, 0, 300).scale(scale).color(powderCoat));
p.part("terminal-arm-2", box(520, 180, 150, true).translate(0, 0, 3735).scale(scale).color(copper));
p.part("interrupter-pole-3", taperedColumn(2652, 175, 10).translate(754, 0, 300).scale(scale).color(powderCoat));
p.part("terminal-arm-3", box(520, 180, 150, true).translate(754, 0, 3735).scale(scale).color(copper));
p.part("mechanism-cabinet", box(598, 440, 1482, true).translate(676, 0, 1041).scale(scale).color(powderCoat));
p.part("terminal-link", box(2288, 150, 170, true).translate(0, -308, 3775).scale(scale).color(copper));

return p.model();
