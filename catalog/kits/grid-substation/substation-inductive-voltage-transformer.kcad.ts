// Inductive voltage transformer: Compact voltage transformer with a stepped body, mounting pedestal, and top terminal. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-inductive-voltage-transformer",
  license: "CC0-1.0",
  title: "Inductive voltage transformer",
  description: "Compact voltage transformer with a stepped body, mounting pedestal, and top terminal. Material controls: stainless steel, powder-coated steel, copper; finish presets: weathered and maintenance.",
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
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { stainlessSteel: '#9da4a0', powderCoat: '#586b63', copper: '#9f704a' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-inductive-voltage-transformer");

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

p.part("base-plate", beveledPlate(1000, 900, 180, 54).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("pedestal", taperedColumn(1034, 140, 10).translate(0, 0, 180).scale(scale).color(stainlessSteel));
p.part("transformer-body", box(820, 702, 658, true).translate(0, 0, 1386.50).scale(scale).color(powderCoat));
p.part("top-terminal", box(360, 315, 180, true).translate(0, 0, 2260).scale(scale).color(copper));
p.part("secondary-box", box(420, 342, 376, true).translate(240, 202.50, 470).scale(scale).color(powderCoat));

return p.model();
