// Chain gate barrier: Two freestanding bollards joined by a raised chain line across an access lane. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-chain-gate-barrier",
  license: "CC0-1.0",
  title: "Chain gate barrier",
  description: "Two freestanding bollards joined by a raised chain line across an access lane. Material controls: concrete, powder-coated steel, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#88887f', powderCoat: '#586b63', stainlessSteel: '#9da4a0' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-chain-gate-barrier");

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

p.part("bollard-base", beveledPlate(420, 450, 220, 25.20).translate(-1312, 0, 0).scale(scale).color(concrete));
p.part("bollard", taperedColumn(1030, 110, 10).translate(-1312, 0, 220).scale(scale).color(powderCoat));
p.part("chain-lug", box(240, 220, 130, true).translate(-1312, 0, 895).scale(scale).color(stainlessSteel));
p.part("bollard-base-2", box(420, 450, 220, true).translate(1312, 0, 110).scale(scale).color(concrete));
p.part("bollard-2", taperedColumn(1030, 110, 10).translate(1312, 0, 220).scale(scale).color(powderCoat));
p.part("chain-lug-2", box(240, 220, 130, true).translate(1312, 0, 895).scale(scale).color(stainlessSteel));
p.part("chain-link", box(2304, 110, 95, true).translate(0, 0, 872.50).scale(scale).color(stainlessSteel));

return p.model();
