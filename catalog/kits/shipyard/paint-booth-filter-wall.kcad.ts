// Paint booth filter wall: Replaceable filter bank with modular frames, intake panels, a lower return plenum, and service feet. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "paint-booth-filter-wall",
  license: 'CC0-1.0',
  title: "Paint booth filter wall",
  description: "Replaceable filter bank with modular frames, intake panels, a lower return plenum, and service feet. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "paint", "booth", "filter", "wall"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#6e8179", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#889891", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5b6b64", "structuralSteel": "#828d91"},
});

const p = assembly("paint-booth-filter-wall");
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

p.part("filter-frame-0", b("filter-frame-0", [1050, 120, 1840], [-1050, 0, 920]).color(structuralSteel));
p.part("filter-frame-1", b("filter-frame-1", [1050, 120, 1840], [-350, 0, 920]).color(structuralSteel));
p.part("filter-frame-2", b("filter-frame-2", [1050, 120, 1840], [350, 0, 920]).color(structuralSteel));
p.part("filter-frame-3", b("filter-frame-3", [1050, 120, 1840], [1050, 0, 920]).color(structuralSteel));
p.part("filter-panel-0", b("filter-panel-0", [650, 70, 1560], [-1050, -80, 900]).color(yardPaint));
p.part("filter-panel-1", b("filter-panel-1", [650, 70, 1560], [-350, -80, 900]).color(yardPaint));
p.part("filter-panel-2", b("filter-panel-2", [650, 70, 1560], [350, -80, 900]).color(yardPaint));
p.part("filter-panel-3", b("filter-panel-3", [650, 70, 1560], [1050, -80, 900]).color(yardPaint));
p.part("return-plenum", b("return-plenum", [3600, 440, 320], [0, 0, 160]).color(yardPaint));
p.part("service-foot-0", b("service-foot-0", [250, 360, 120], [-1600, 0, 60]).color(structuralSteel));
p.part("service-foot-1", b("service-foot-1", [250, 360, 120], [1600, 0, 60]).color(structuralSteel));
p.part("top-cap", b("top-cap", [3650, 300, 140], [0, 0, 1920]).color(yardPaint));

return p.model();
