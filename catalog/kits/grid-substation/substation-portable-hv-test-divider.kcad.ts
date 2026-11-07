// Portable HV test divider: Portable measurement divider on a tripod base with a stepped insulated column. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-portable-hv-test-divider",
  license: "CC0-1.0",
  title: "Portable HV test divider",
  description: "Portable measurement divider on a tripod base with a stepped insulated column. Material controls: galvanized steel, porcelain, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
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
presets({
  weathered: { galvanizedSteel: '#778080', porcelain: '#cac4b1', copper: '#9f704a' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-portable-hv-test-divider");

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

p.part("tripod-leg-1", box(170, 264, 867, true).translate(-594, 0, 433.50).scale(scale).color(galvanizedSteel));
p.part("tripod-leg-2", box(170, 264, 867, true).translate(594, 0, 433.50).scale(scale).color(galvanizedSteel));
p.part("tripod-hub", box(1089, 792, 220, true).translate(0, 0, 824).scale(scale).color(galvanizedSteel));
p.part("divider-column", loftedInsulator(1377, 264, 10).translate(0, 0, 1173).scale(scale).color(porcelain));
p.part("divider-shed-1", loftedInsulator(95, 511.50, 10).translate(0, 0, 1275).scale(scale).color(porcelain));
p.part("divider-shed-2", loftedInsulator(95, 511.50, 10).translate(0, 0, 1458.60).scale(scale).color(porcelain));
p.part("divider-shed-3", loftedInsulator(95, 511.50, 10).translate(0, 0, 1642.20).scale(scale).color(porcelain));
p.part("divider-shed-4", loftedInsulator(95, 511.50, 10).translate(0, 0, 1825.80).scale(scale).color(porcelain));
p.part("divider-shed-5", loftedInsulator(95, 511.50, 10).translate(0, 0, 2009.40).scale(scale).color(porcelain));
p.part("divider-shed-6", loftedInsulator(95, 511.50, 10).translate(0, 0, 2193).scale(scale).color(porcelain));
p.part("top-terminal", box(240, 240, 170, true).translate(0, 0, 2465).scale(scale).color(copper));

return p.model();
