// Modular scaffold bay: Short shipyard access scaffold with twin end frames, diagonal braces, a work deck, ladder rungs, and toe boards. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "modular-scaffold-bay",
  license: 'CC0-1.0',
  title: "Modular scaffold bay",
  description: "Short shipyard access scaffold with twin end frames, diagonal braces, a work deck, ladder rungs, and toe boards. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "modular", "scaffold", "bay"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#788781", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#909d98", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#64706b", "structuralSteel": "#828d91"},
});

const p = assembly("modular-scaffold-bay");
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

p.part("upright-0", b("upright-0", [110, 110, 2140], [-920, -430, 1070]).color(structuralSteel));
p.part("upright-1", b("upright-1", [110, 110, 2140], [920, -430, 1070]).color(structuralSteel));
p.part("upright-2", b("upright-2", [110, 110, 2140], [-920, 430, 1070]).color(structuralSteel));
p.part("upright-3", b("upright-3", [110, 110, 2140], [920, 430, 1070]).color(structuralSteel));
p.part("ledger-0", b("ledger-0", [1840, 100, 100], [0, -430, 450]).color(structuralSteel));
p.part("ledger-1", b("ledger-1", [1840, 100, 100], [0, 430, 450]).color(structuralSteel));
p.part("ledger-2", b("ledger-2", [1840, 100, 100], [0, -430, 1590]).color(structuralSteel));
p.part("ledger-3", b("ledger-3", [1840, 100, 100], [0, 430, 1590]).color(structuralSteel));
p.part("cross-brace-0", b("cross-brace-0", [150, 920, 1100], [-920, -220, 1020]).color(yardPaint));
p.part("cross-brace-1", b("cross-brace-1", [150, 920, 1100], [920, 220, 1020]).color(structuralSteel));
p.part("work-deck", b("work-deck", [1740, 780, 110], [0, 0, 1570]).color(yardPaint));
p.part("toe-board", b("toe-board", [1740, 80, 150], [0, -390, 1700]).color(yardPaint));
p.part("ladder-rung-0", b("ladder-rung-0", [560, 85, 75], [-930, -470, 270]).color(yardPaint));
p.part("ladder-rung-1", b("ladder-rung-1", [560, 85, 75], [-930, -470, 480]).color(yardPaint));
p.part("ladder-rung-2", b("ladder-rung-2", [560, 85, 75], [-930, -470, 690]).color(yardPaint));
p.part("ladder-rung-3", b("ladder-rung-3", [560, 85, 75], [-930, -470, 900]).color(yardPaint));
p.part("ladder-rung-4", b("ladder-rung-4", [560, 85, 75], [-930, -470, 1110]).color(yardPaint));
p.part("ladder-rung-5", b("ladder-rung-5", [560, 85, 75], [-930, -470, 1320]).color(yardPaint));

return p.model();
