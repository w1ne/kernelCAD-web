// Optical current transformer: Tall optical current sensor with a distinctive open sensing loop above its support. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-optical-current-transformer",
  license: "CC0-1.0",
  title: "Optical current transformer",
  description: "Tall optical current sensor with a distinctive open sensing loop above its support. Material controls: stainless steel, powder-coated steel, insulating polymer; finish presets: weathered and maintenance.",
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
const polymer = param('polymer', '#6f91a0', { label: 'Insulating polymer' });
presets({
  weathered: { stainlessSteel: '#9da4a0', powderCoat: '#586b63', polymer: '#6c838a' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-optical-current-transformer");

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

p.part("base-plate", beveledPlate(900, 820, 180, 49.20).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("pedestal", taperedColumn(1078, 126, 10).translate(0, 0, 180).scale(scale).color(stainlessSteel));
p.part("sensor-body", box(612, 541.20, 416.50, true).translate(0, 0, 1261.75).scale(scale).color(powderCoat));
p.part("sensor-loop-left", box(150, 98.40, 1078, true).translate(-270, 0, 1960).scale(scale).color(polymer));
p.part("sensor-loop-right", box(150, 98.40, 1078, true).translate(270, 0, 1960).scale(scale).color(polymer));
p.part("sensor-bridge", box(594, 98.40, 140, true).translate(0, 0, 2373).scale(scale).color(powderCoat));
p.part("secondary-box", box(378, 311.60, 392, true).translate(216, 184.50, 490).scale(scale).color(powderCoat));

return p.model();
