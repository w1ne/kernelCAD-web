// Busbar expansion joint: Two aligned conductor ends joined by a flexible expansion section. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-busbar-expansion-joint",
  license: "CC0-1.0",
  title: "Busbar expansion joint",
  description: "Two aligned conductor ends joined by a flexible expansion section. Material controls: galvanized steel, copper, porcelain; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const copper = param('copper', '#b87545', { label: 'Copper' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
presets({
  weathered: { galvanizedSteel: '#778080', copper: '#9f704a', porcelain: '#cac4b1' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-busbar-expansion-joint");

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

p.part("support-left", box(460, 680, 330, true).translate(-648, 0, 165).scale(scale).color(galvanizedSteel));
p.part("support-right", box(460, 680, 330, true).translate(648, 0, 165).scale(scale).color(galvanizedSteel));
p.part("conductor-left", box(720, 180, 190, true).translate(-387, 0, 368).scale(scale).color(copper));
p.part("conductor-right", box(720, 180, 190, true).translate(387, 0, 368).scale(scale).color(copper));
p.part("flexible-link", box(576, 360, 120, true).translate(0, 0, 411).scale(scale).color(copper));
p.part("insulator-1", loftedInsulator(292.50, 105, 10).translate(-630, 0, 195).scale(scale).color(porcelain));
p.part("insulator-2", loftedInsulator(292.50, 105, 10).translate(630, 0, 195).scale(scale).color(porcelain));

return p.model();
