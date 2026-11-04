// Capacitive voltage transformer: Capacitive voltage transformer with stacked divider sections and an upper terminal. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-capacitive-voltage-transformer",
  license: "CC0-1.0",
  title: "Capacitive voltage transformer",
  description: "Capacitive voltage transformer with stacked divider sections and an upper terminal. Material controls: stainless steel, powder-coated steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
presets({
  weathered: { stainlessSteel: '#9da4a0', powderCoat: '#586b63' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-capacitive-voltage-transformer");

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

p.part("base-plate", beveledPlate(1250, 950, 180, 57).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("pedestal", taperedColumn(1276, 175, 10).translate(0, 0, 180).scale(scale).color(stainlessSteel));
p.part("divider-section-1", cylinder(348, 425, 10).translate(0, 0, 1276).scale(scale).color(powderCoat));
p.part("divider-section-2", cylinder(348, 381.25, 10).translate(0, 0, 1653).scale(scale).color(powderCoat));
p.part("divider-section-3", cylinder(348, 337.50, 10).translate(0, 0, 2030).scale(scale).color(powderCoat));
p.part("divider-section-4", cylinder(348, 293.75, 10).translate(0, 0, 2407).scale(scale).color(powderCoat));
p.part("secondary-box", box(525, 361, 464, true).translate(300, 213.75, 580).scale(scale).color(powderCoat));

return p.model();
