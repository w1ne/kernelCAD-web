// Portable HV test divider scene prop with three splayed legs, a supported
// insulated column and six sheds. Millimetres, Z up; illustrative CC0 geometry.
// No voltage rating, resistor network, creepage or structural acceptance is implied.
meta({
  name: "substation-portable-hv-test-divider",
  license: "CC0-1.0",
  title: "Portable HV test divider",
  description: "Illustrative portable measurement divider on three splayed tripod legs with a supported insulated column and six sheds. No electrical or structural rating. Material controls: galvanized steel, porcelain, copper; finish presets: weathered and maintenance.",
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

// Three distinct feet lie 120 degrees apart. The leg tops seat on the hub's
// underside at Z=930; the hub supports the column at Z=1173 without a gap.
for (const [index, angle] of [0, 120, 240].entries()) {
  const leg = prismSideY([[600, 0], [770, 0], [370, 930], [200, 930]], -50, 50)
    .rotateZ(angle);
  p.part(`tripod-leg-${index + 1}`, leg.scale(scale).color(galvanizedSteel));
}
p.part("tripod-hub", ngon(400, 6).extrude(243).translate(0, 0, 930).scale(scale).color(galvanizedSteel));

// The column and sheds are one continuous insulating body. The terminal sits
// on its top at Z=2380; preserve the original 2550 mm overall scene height.
let insulator = loftedInsulator(1207, 264, 10).translate(0, 0, 1173);
for (const z of [1275, 1458.6, 1642.2, 1825.8, 2009.4, 2193]) {
  insulator = insulator.union(loftedInsulator(95, 511.5, 10).translate(0, 0, z));
}
p.part("divider-column", insulator.scale(scale).color(porcelain));
p.part("top-terminal", box(240, 240, 170, true).translate(0, 0, 2465).scale(scale).color(copper));

return p.model();
