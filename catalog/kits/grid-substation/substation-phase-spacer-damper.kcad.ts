// Phase spacer damper: Cross-shaped spacer assembly for a bundled conductor scene. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-phase-spacer-damper",
  license: "CC0-1.0",
  title: "Phase spacer damper",
  description: "Cross-shaped spacer assembly for a bundled conductor scene. Material controls: copper, galvanized steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const copper = param('copper', '#b87545', { label: 'Copper' });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
presets({
  weathered: { copper: '#9f704a', galvanizedSteel: '#778080' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-phase-spacer-damper");

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

p.part("lower-conductor-support", box(1444, 180, 120, true).translate(0, 0, 60).scale(scale).color(copper));
p.part("cross-core", box(1368, 180, 180, true).translate(0, 0, 384).scale(scale).color(copper));
p.part("arm-left", box(684, 420, 200, true).translate(-408.50, 0, 324).scale(scale).color(galvanizedSteel));
p.part("arm-right", box(684, 420, 200, true).translate(408.50, 0, 324).scale(scale).color(galvanizedSteel));
p.part("conductor-sleeve-1", taperedColumn(210, 115, 10).translate(-446.50, 0, 385).scale(scale).color(copper));
p.part("conductor-sleeve-2", taperedColumn(210, 115, 10).translate(446.50, 0, 385).scale(scale).color(copper));

return p.model();
