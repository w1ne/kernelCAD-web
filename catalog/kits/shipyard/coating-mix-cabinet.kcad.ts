// Coating mix cabinet: Ventilated material cabinet with a mixing worktop, paired lower doors, top extraction hood, and side shelf. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "coating-mix-cabinet",
  license: 'CC0-1.0',
  title: "Coating mix cabinet",
  description: "Ventilated material cabinet with a mixing worktop, paired lower doors, top extraction hood, and side shelf. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "coating", "mix", "cabinet"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#7d7567", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#948e82", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#686155", "structuralSteel": "#828d91"},
});

const p = assembly("coating-mix-cabinet");
const originOffsetMm = 0;

const panelProfile = (w: number, d: number, corner: number) => {
  const c = Math.max(0.5, Math.min(corner, w * 0.18, d * 0.18));
  return path().moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2)
    .lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c)
    .lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2)
    .lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).close();
};
const profiledBox = (w: number, d: number, h: number) => {
  const corner = Math.min(w, d) * 0.08;
  const inset = Math.min(w, d) * 0.025;
  return panelProfile(w, d, corner)
    .loft(panelProfile(w - inset * 2, d - inset * 2, corner * 0.9), { spacing: h, ruled: true })
    .translate(0, 0, -h / 2);
};
const taperedBox = (w: number, d: number, h: number) => {
  const bottom = panelProfile(w * 0.68, d * 0.68, Math.min(w, d) * 0.05);
  const top = panelProfile(w, d, Math.min(w, d) * 0.08);
  return bottom.loft(top, { spacing: h, ruled: true }).translate(0, 0, -h / 2);
};
const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = /^(bin-body|hopper-body|collection-bin)$/.test(name) ? taperedBox(size[0], size[1], size[2]) : profiledBox(size[0], size[1], size[2]);
  if (rotation?.[0]) shape = shape.rotateX(rotation[0]);
  if (rotation?.[1]) shape = shape.rotateY(rotation[1]);
  if (rotation?.[2]) shape = shape.rotateZ(rotation[2]);
  return shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
};

p.part("cabinet-body", b("cabinet-body", [1440, 820, 1360], [0, 0, 760]).color(yardPaint));
p.part("toe-kick", b("toe-kick", [1510, 880, 140], [0, 0, 70]).color(yardPaint));
p.part("mixing-top", b("mixing-top", [1580, 960, 120], [0, 0, 1500]).color(yardPaint));
p.part("lower-door-0", b("lower-door-0", [650, 50, 920], [-350, -420, 650]).color(yardPaint));
p.part("lower-door-1", b("lower-door-1", [650, 50, 920], [350, -420, 650]).color(yardPaint));
p.part("extraction-hood", b("extraction-hood", [900, 620, 230], [0, 80, 1675]).color(yardPaint));
p.part("side-shelf", b("side-shelf", [520, 560, 110], [980, 50, 1040]).color(structuralSteel));
p.part("vent-stack", b("vent-stack", [170, 170, 570], [0, 80, 2075]).color(structuralSteel));

return p.model();
