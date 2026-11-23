// Surface preparation drying rack: Open rack for small hull panels with four uprights, removable cross bars, tray feet, and spacing stops. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "surface-prep-drying-rack",
  license: 'CC0-1.0',
  title: "Surface preparation drying rack",
  description: "Open rack for small hull panels with four uprights, removable cross bars, tray feet, and spacing stops. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface", "preparation", "drying", "rack"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#78847c", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#909a94", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#646e67", "structuralSteel": "#828d91"},
});

const p = assembly("surface-prep-drying-rack");
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

p.part("upright-0", b("upright-0", [120, 140, 1940], [-920, -520, 970]).color(yardPaint));
p.part("upright-1", b("upright-1", [120, 140, 1940], [920, -520, 970]).color(structuralSteel));
p.part("upright-2", b("upright-2", [120, 140, 1940], [-920, 520, 970]).color(structuralSteel));
p.part("upright-3", b("upright-3", [120, 140, 1940], [920, 520, 970]).color(structuralSteel));
p.part("crossbar-0", b("crossbar-0", [1840, 150, 110], [0, -520, 640]).color(structuralSteel));
p.part("crossbar-1", b("crossbar-1", [1840, 150, 110], [0, 520, 640]).color(structuralSteel));
p.part("crossbar-2", b("crossbar-2", [1840, 150, 110], [0, -520, 1310]).color(structuralSteel));
p.part("crossbar-3", b("crossbar-3", [1840, 150, 110], [0, 520, 1310]).color(structuralSteel));
p.part("panel-stop-0", b("panel-stop-0", [130, 210, 580], [-720, -520, 1740]).color(structuralSteel));
p.part("panel-stop-1", b("panel-stop-1", [130, 210, 580], [720, -520, 1740]).color(structuralSteel));
p.part("panel-stop-2", b("panel-stop-2", [130, 210, 580], [-720, 520, 1740]).color(structuralSteel));
p.part("panel-stop-3", b("panel-stop-3", [130, 210, 580], [720, 520, 1740]).color(structuralSteel));
p.part("tray-foot-0", b("tray-foot-0", [380, 320, 130], [-920, -520, 65]).color(structuralSteel));
p.part("tray-foot-1", b("tray-foot-1", [380, 320, 130], [920, -520, 65]).color(structuralSteel));
p.part("tray-foot-2", b("tray-foot-2", [380, 320, 130], [-920, 520, 65]).color(structuralSteel));
p.part("tray-foot-3", b("tray-foot-3", [380, 320, 130], [920, 520, 65]).color(structuralSteel));

return p.model();
