// Transformer oil sampling station: Small sampling cabinet with bottle shelf, drain tray, and pipe connection points. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-transformer-oil-sampling-station",
  license: "CC0-1.0",
  title: "Transformer oil sampling station",
  description: "Small sampling cabinet with bottle shelf, drain tray, and pipe connection points. Material controls: powder-coated steel, stainless steel, glass; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
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
const p = assembly("substation-transformer-oil-sampling-station");

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

p.part("cabinet-base", beveledPlate(1300, 850, 180, 51).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("sample-cabinet", box(936, 595, 1190, true).translate(0, 0, 775).scale(scale).color(powderCoat));
p.part("work-shelf", box(1092, 297.50, 120, true).translate(0, -263.50, 961).scale(scale).color(stainlessSteel));
p.part("drip-tray", box(1014, 612, 70, true).translate(0, 0, 235).scale(scale).color(stainlessSteel));
p.part("sample-bottle-1", taperedColumn(476, 95, 10).translate(-221, 0, 935).scale(scale).color(glass));
p.part("sample-bottle-2", taperedColumn(476, 95, 10).translate(221, 0, 935).scale(scale).color(glass));
p.part("sample-bottle-3", taperedColumn(476, 95, 10).translate(663, 0, 935).scale(scale).color(glass));

return p.model();
