// Dead tank circuit breaker: Three grounded horizontal interrupter tanks carry seated porcelain bushings above a shared copper terminal link, with a side operating cabinet. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-dead-tank-breaker",
  license: "CC0-1.0",
  title: "Dead tank circuit breaker",
  description: "Three grounded horizontal interrupter tanks with seated porcelain bushings, a shared copper terminal link and a side operating cabinet. Material controls: galvanized steel, powder-coated steel, porcelain, copper; finish presets: weathered and maintenance.",
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
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { galvanizedSteel: '#778080', powderCoat: '#586b63', porcelain: '#cac4b1', copper: '#9f704a' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-dead-tank-breaker");

const ngon = (r: number, sides: number) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    outline = outline.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return outline.close();
};
const loftedInsulator = (height: number, radius: number, sides = 10) => {
  const levels = [0, .08, .18, .29, .40, .51, .62, .73, .84, .93, 1].map((v) => height * v);
  const radii = [.76, .98, .62, .96, .62, .96, .62, .96, .62, .95, .76].map((v) => radius * v);
  const profiles = radii.map((r) => ngon(r, sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const loftedTank = (length: number, radius: number, sides = 12) => {
  const levels = [0, .08, .92, 1].map((v) => length * v);
  const radii = [radius * .86, radius, radius, radius * .86];
  const profiles = radii.map((r) => ngon(r, sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

const phases = [-870, 0, 870];
p.part("breaker-base", beveledPlate(3800, 1600, 300, 120).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
for (let i = 0; i < phases.length; i++) {
  const x = phases[i];
  p.part(`tank-saddle-${i + 1}`, box(520, 140, 390, true).translate(x, 0, 495).scale(scale).color(galvanizedSteel));
  p.part(`interrupter-tank-${i + 1}`, loftedTank(800, 250, 12).rotateX(90).translate(x, 400, 940).scale(scale).color(powderCoat));
  p.part(`bushing-${i + 1}`, loftedInsulator(900, 130, 10).translate(x, 0, 1185).scale(scale).color(porcelain));
}
p.part("mechanism-cabinet", box(620, 620, 1000, true).translate(1480, 0, 800).scale(scale).color(powderCoat));
p.part("terminal-link", box(2640, 150, 120, true).translate(0, 0, 2115).scale(scale).color(copper));

return p.model();
