// Fire suppression cylinder bank: Grouped suppression cylinders held in a rack with a shared manifold header. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-fire-suppression-cylinder-bank",
  license: "CC0-1.0",
  title: "Fire suppression cylinder bank",
  description: "Grouped suppression cylinders held in a rack with a shared manifold header. Material controls: galvanized steel, safety red, brass; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const safetyRed = param('safetyRed', '#c7493c', { label: 'Safety red' });
const brass = param('brass', '#bf9143', { label: 'Brass' });
presets({
  weathered: { galvanizedSteel: '#778080', safetyRed: '#aa5144', brass: '#a48349' },
  maintenance: { safetyRed: '#e45b4d' },
});
const p = assembly("substation-fire-suppression-cylinder-bank");

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

p.part("rack-base", beveledPlate(2200, 900, 200, 54).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("top-retainer", beveledPlate(2200, 900, 160, 54).translate(0, 0, 1690).scale(scale).color(galvanizedSteel));
p.part("cylinder-1", taperedColumn(1332, 162, 10).translate(-880, 0, 200).scale(scale).color(safetyRed));
p.part("valve-1", box(170, 200, 130, true).translate(-880, 0, 1619).scale(scale).color(brass));
p.part("cylinder-2", taperedColumn(1332, 162, 10).translate(0, 0, 200).scale(scale).color(safetyRed));
p.part("valve-2", box(170, 200, 130, true).translate(0, 0, 1619).scale(scale).color(brass));
p.part("cylinder-3", taperedColumn(1332, 162, 10).translate(880, 0, 200).scale(scale).color(safetyRed));
p.part("valve-3", box(170, 200, 130, true).translate(880, 0, 1619).scale(scale).color(brass));
p.part("cylinder-4", taperedColumn(1332, 162, 10).translate(1760, 0, 200).scale(scale).color(safetyRed));
p.part("valve-4", box(170, 200, 130, true).translate(1760, 0, 1619).scale(scale).color(brass));
p.part("cylinder-5", taperedColumn(1332, 162, 10).translate(2640, 0, 200).scale(scale).color(safetyRed));
p.part("valve-5", box(170, 200, 130, true).translate(2640, 0, 1619).scale(scale).color(brass));
p.part("manifold-header", box(2024, 150, 160, true).translate(0, 112.50, 1782).scale(scale).color(galvanizedSteel));

return p.model();
