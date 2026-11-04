// Shield wire mast: Slender yard mast with a high crossarm for an overhead shield wire. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-shield-wire-mast",
  license: "CC0-1.0",
  title: "Shield wire mast",
  description: "Slender yard mast with a high crossarm for an overhead shield wire. Material controls: concrete, galvanized steel, porcelain; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
presets({
  weathered: { concrete: '#88887f', galvanizedSteel: '#778080', porcelain: '#cac4b1' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-shield-wire-mast");

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
const taperedColumn = (height: number, radius: number, sides = 10) => {
  const profiles = [ngon(radius * 1.2, sides), ngon(radius * .72, sides)];
  return profiles[0].loft(profiles.slice(1), {
    planes: [{ plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
      { plane: 'XY' as const, origin: [0, 0, height] as [number, number, number] }],
    ruled: true,
  });
};

const brace = (name: string, a: [number, number, number], b: [number, number, number], thickness: number) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx) * 180 / Math.PI;
  p.part(name, box(length, thickness, thickness, true).rotateY(angle)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    .scale(scale).color(galvanizedSteel));
};

p.part("foundation", box(760, 760, 420, true).translate(0, 0, 210).scale(scale).color(concrete));
p.part("mast-shaft", taperedColumn(8880, 110, 10).translate(0, 0, 420).scale(scale).color(galvanizedSteel));
p.part("main-crossarm", box(2100, 260, 220, true).translate(0, 0, 8480).scale(scale).color(galvanizedSteel));
p.part("upper-crossarm", box(1450, 220, 180, true).translate(0, 0, 7840).scale(scale).color(galvanizedSteel));
p.part("crossarm-insulator-1", loftedInsulator(450, 92, 10).translate(-920, 0, 7920).scale(scale).color(porcelain));
p.part("crossarm-insulator-2", loftedInsulator(450, 92, 10).translate(0, 0, 7920).scale(scale).color(porcelain));
p.part("crossarm-insulator-3", loftedInsulator(450, 92, 10).translate(920, 0, 7920).scale(scale).color(porcelain));

brace("crossarm-brace-left", [0, 0, 5766], [-760, 0, 8360], 100);
brace("crossarm-brace-right", [0, 0, 5766], [760, 0, 8360], 100);

return p.model();
