// Transformer bushing turret: Tank-top turret frame with three tall bushing stacks and terminal pads. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-bushing-turret",
  license: "CC0-1.0",
  title: "Transformer bushing turret",
  description: "Tank-top turret frame with three tall bushing stacks and terminal pads. Material controls: powder-coated steel, porcelain, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { powderCoat: '#586b63', porcelain: '#cac4b1', copper: '#9f704a' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-bushing-turret");

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
const loftedShed = (height: number, radius: number, sides = 8) => {
  const levels = [0, .16, .78, 1].map((v) => height * v);
  const radii = [.60, 1, .88, .62].map((v) => radius * v);
  const profiles = radii.map((r) => ngon(r, sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};

p.part("turret-frame", box(1700, 1450, 350, true).translate(0, 0, 175).scale(scale).color(powderCoat));
p.part("mounting-cap", box(1496, 1276, 180, true).translate(0, 0, 440).scale(scale).color(powderCoat));
p.part("bushing-core-1", loftedInsulator(1496, 105, 10).translate(-510, 0, 530).scale(scale).color(porcelain));
p.part("bushing-shed-1-1", loftedShed(80, 185, 8).translate(-510, 0, 700).scale(scale).color(porcelain));
p.part("bushing-shed-1-2", loftedShed(80, 185, 8).translate(-510, 0, 953).scale(scale).color(porcelain));
p.part("bushing-shed-1-3", loftedShed(80, 185, 8).translate(-510, 0, 1206).scale(scale).color(porcelain));
p.part("bushing-shed-1-4", loftedShed(80, 185, 8).translate(-510, 0, 1459).scale(scale).color(porcelain));
p.part("bushing-shed-1-5", loftedShed(80, 185, 8).translate(-510, 0, 1712).scale(scale).color(porcelain));
p.part("terminal-1", box(230, 230, 150, true).translate(-510, 0, 2125).scale(scale).color(copper));
p.part("bushing-core-2", loftedInsulator(1496, 105, 10).translate(0, 0, 530).scale(scale).color(porcelain));
p.part("bushing-shed-2-1", loftedShed(80, 185, 8).translate(0, 0, 700).scale(scale).color(porcelain));
p.part("bushing-shed-2-2", loftedShed(80, 185, 8).translate(0, 0, 953).scale(scale).color(porcelain));
p.part("bushing-shed-2-3", loftedShed(80, 185, 8).translate(0, 0, 1206).scale(scale).color(porcelain));
p.part("bushing-shed-2-4", loftedShed(80, 185, 8).translate(0, 0, 1459).scale(scale).color(porcelain));
p.part("bushing-shed-2-5", loftedShed(80, 185, 8).translate(0, 0, 1712).scale(scale).color(porcelain));
p.part("terminal-2", box(230, 230, 150, true).translate(0, 0, 2125).scale(scale).color(copper));
p.part("bushing-core-3", loftedInsulator(1496, 105, 10).translate(510, 0, 530).scale(scale).color(porcelain));
p.part("bushing-shed-3-1", loftedShed(80, 185, 8).translate(510, 0, 700).scale(scale).color(porcelain));
p.part("bushing-shed-3-2", loftedShed(80, 185, 8).translate(510, 0, 953).scale(scale).color(porcelain));
p.part("bushing-shed-3-3", loftedShed(80, 185, 8).translate(510, 0, 1206).scale(scale).color(porcelain));
p.part("bushing-shed-3-4", loftedShed(80, 185, 8).translate(510, 0, 1459).scale(scale).color(porcelain));
p.part("bushing-shed-3-5", loftedShed(80, 185, 8).translate(510, 0, 1712).scale(scale).color(porcelain));
p.part("terminal-3", box(230, 230, 150, true).translate(510, 0, 2125).scale(scale).color(copper));

return p.model();
