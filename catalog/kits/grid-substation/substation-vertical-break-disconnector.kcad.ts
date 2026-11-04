// Vertical break disconnector: Vertical break switch with elevated blade pivots and three visible phase positions. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-vertical-break-disconnector",
  license: "CC0-1.0",
  title: "Vertical break disconnector",
  description: "Vertical break switch with elevated blade pivots and three visible phase positions. Material controls: galvanized steel, porcelain, copper, powder-coated steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const copper = param('copper', '#b87545', { label: 'Copper' });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
presets({
  weathered: { galvanizedSteel: '#778080', porcelain: '#cac4b1', copper: '#9f704a', powderCoat: '#586b63' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-vertical-break-disconnector");

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
const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("base-frame", beveledPlate(3500, 1050, 220, 63).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("phase-1-support--1", cylinder(1650, 95, 10).translate(-980, -231, 220).scale(scale).color(galvanizedSteel));
p.part("phase-1-insulator--1", loftedInsulator(570, 145, 10).translate(-980, -231, 1650).scale(scale).color(porcelain));
p.part("phase-1-support-1", cylinder(1650, 95, 10).translate(-980, 231, 220).scale(scale).color(galvanizedSteel));
p.part("phase-1-insulator-1", loftedInsulator(570, 145, 10).translate(-980, 231, 1650).scale(scale).color(porcelain));
p.part("phase-1-blade", box(110, 525, 90, true).rotateX(24).translate(-980, 0, 2535).scale(scale).color(copper));
p.part("phase-2-support--1", cylinder(1650, 95, 10).translate(0, -231, 220).scale(scale).color(galvanizedSteel));
p.part("phase-2-insulator--1", loftedInsulator(570, 145, 10).translate(0, -231, 1650).scale(scale).color(porcelain));
p.part("phase-2-support-1", cylinder(1650, 95, 10).translate(0, 231, 220).scale(scale).color(galvanizedSteel));
p.part("phase-2-insulator-1", loftedInsulator(570, 145, 10).translate(0, 231, 1650).scale(scale).color(porcelain));
p.part("phase-2-blade", box(110, 525, 90, true).rotateX(24).translate(0, 0, 2535).scale(scale).color(copper));
p.part("phase-3-support--1", cylinder(1650, 95, 10).translate(980, -231, 220).scale(scale).color(galvanizedSteel));
p.part("phase-3-insulator--1", loftedInsulator(570, 145, 10).translate(980, -231, 1650).scale(scale).color(porcelain));
p.part("phase-3-support-1", cylinder(1650, 95, 10).translate(980, 231, 220).scale(scale).color(galvanizedSteel));
p.part("phase-3-insulator-1", loftedInsulator(570, 145, 10).translate(980, 231, 1650).scale(scale).color(porcelain));
p.part("phase-3-blade", box(110, 525, 90, true).rotateX(24).translate(980, 0, 2535).scale(scale).color(copper));
p.part("drive-cabinet", box(630, 315, 1020, true).translate(-1260, 0, 730).scale(scale).color(powderCoat));
p.part("operating-link", box(2170, 95, 90, true).translate(0, 399, 1305).scale(scale).color(copper));

return p.model();
