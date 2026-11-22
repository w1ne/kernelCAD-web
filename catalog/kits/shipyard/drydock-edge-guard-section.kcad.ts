// Drydock edge guard section: Removable edge protection with weighted feet, rail posts, twin guard rails, and a high-visibility end panel. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "drydock-edge-guard-section",
  license: 'CC0-1.0',
  title: "Drydock edge guard section",
  description: "Removable edge protection with weighted feet, rail posts, twin guard rails, and a high-visibility end panel. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "edge", "guard", "section"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#d3a347", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#dbb468", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#af873b", "structuralSteel": "#828d91"},
});

const p = assembly("drydock-edge-guard-section");
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

p.part("base-foot-0", b("base-foot-0", [380, 440, 110], [-1000, 0, 55]).color(structuralSteel));
p.part("base-foot-1", b("base-foot-1", [380, 440, 110], [0, 0, 55]).color(structuralSteel));
p.part("base-foot-2", b("base-foot-2", [380, 440, 110], [1000, 0, 55]).color(structuralSteel));
p.part("rail-post-0", b("rail-post-0", [100, 100, 1150], [-1000, 0, 680]).color(structuralSteel));
p.part("rail-post-1", b("rail-post-1", [100, 100, 1150], [0, 0, 680]).color(structuralSteel));
p.part("rail-post-2", b("rail-post-2", [100, 100, 1150], [1000, 0, 680]).color(structuralSteel));
p.part("guard-rail-0", b("guard-rail-0", [2050, 90, 100], [0, 0, 460]).color(structuralSteel));
p.part("guard-rail-1", b("guard-rail-1", [2050, 90, 100], [0, 0, 1040]).color(structuralSteel));
p.part("end-warning-panel", b("end-warning-panel", [420, 100, 780], [1040, 0, 790]).color(yardPaint));

return p.model();
