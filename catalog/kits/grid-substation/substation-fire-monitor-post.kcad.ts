// Fire monitor post: Fixed monitor post with a raised nozzle head and two-sided control handles. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-fire-monitor-post",
  license: "CC0-1.0",
  title: "Fire monitor post",
  description: "Fixed monitor post with a raised nozzle head and two-sided control handles. Material controls: galvanized steel, brass; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const brass = param('brass', '#bf9143', { label: 'Brass' });
presets({
  weathered: { galvanizedSteel: '#778080', brass: '#a48349' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-fire-monitor-post");

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

p.part("pedestal-foot", beveledPlate(1250, 900, 250, 54).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("standpipe", taperedColumn(1426, 140, 10).translate(0, 0, 250).scale(scale).color(galvanizedSteel));
p.part("monitor-body", box(687.50, 378, 280, true).translate(0, 0, 1865).scale(scale).color(brass));
p.part("nozzle", box(625, 225, 190, true).translate(0, -225, 2027).scale(scale).color(brass));
p.part("handle-left", box(90, 702, 120, true).translate(-325, 0, 1716).scale(scale).color(galvanizedSteel));
p.part("handle-right", box(90, 702, 120, true).translate(325, 0, 1716).scale(scale).color(galvanizedSteel));

return p.model();
