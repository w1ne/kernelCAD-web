// Hull survey grid frame: Portable reference frame with an open rectangle, graduated crossbars, leveling feet, and target mounts. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "hull-survey-grid-frame",
  license: 'CC0-1.0',
  title: "Hull survey grid frame",
  description: "Portable reference frame with an open rectangle, graduated crossbars, leveling feet, and target mounts. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "hull", "survey", "grid", "frame"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#6e817a", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#889892", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5b6b65", "structuralSteel": "#828d91"},
});

const p = assembly("hull-survey-grid-frame");
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

p.part("frame-rail-0", b("frame-rail-0", [2300, 110, 120], [0, -650, 60]).color(yardPaint));
p.part("frame-rail-1", b("frame-rail-1", [2300, 110, 120], [0, 650, 60]).color(structuralSteel));
p.part("frame-rail-2", b("frame-rail-2", [2300, 110, 120], [0, -650, 1800]).color(structuralSteel));
p.part("frame-rail-3", b("frame-rail-3", [2300, 110, 120], [0, 650, 1800]).color(structuralSteel));
p.part("upright-0", b("upright-0", [110, 110, 1800], [-1150, -650, 900]).color(structuralSteel));
p.part("upright-1", b("upright-1", [110, 110, 1800], [1150, -650, 900]).color(structuralSteel));
p.part("upright-2", b("upright-2", [110, 110, 1800], [-1150, 650, 900]).color(structuralSteel));
p.part("upright-3", b("upright-3", [110, 110, 1800], [1150, 650, 900]).color(structuralSteel));
p.part("cross-reference-0", b("cross-reference-0", [180, 1320, 100], [-600, 0, 650]).color(structuralSteel));
p.part("cross-reference-1", b("cross-reference-1", [180, 1320, 100], [0, 0, 900]).color(structuralSteel));
p.part("cross-reference-2", b("cross-reference-2", [180, 1320, 100], [600, 0, 1150]).color(structuralSteel));

return p.model();
