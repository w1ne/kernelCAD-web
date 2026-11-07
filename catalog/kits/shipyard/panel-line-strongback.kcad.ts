// Panel line strongback: Long modular strongback fixture with spaced cross rails, clamp blocks, end stops, and datum feet. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "panel-line-strongback",
  license: 'CC0-1.0',
  title: "Panel line strongback",
  description: "Long modular strongback fixture with spaced cross rails, clamp blocks, end stops, and datum feet. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "panel", "line", "strongback"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#78867d", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#909c94", "structuralSteel": "#d0d7d8", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#646f68", "structuralSteel": "#828d91", "safetyMarking": "#bd8528"},
});

const p = assembly("panel-line-strongback");
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

p.part("longitudinal-rail-0", b("longitudinal-rail-0", [3000, 150, 180], [0, -620, 90]).color(yardPaint));
p.part("longitudinal-rail-1", b("longitudinal-rail-1", [3000, 150, 180], [0, 620, 90]).color(structuralSteel));
p.part("cross-rail-0", b("cross-rail-0", [165, 1320, 130], [-1200, 0, 245]).color(structuralSteel));
p.part("cross-rail-1", b("cross-rail-1", [165, 1320, 130], [-600, 0, 245]).color(structuralSteel));
p.part("cross-rail-2", b("cross-rail-2", [165, 1320, 130], [0, 0, 245]).color(structuralSteel));
p.part("cross-rail-3", b("cross-rail-3", [165, 1320, 130], [600, 0, 245]).color(structuralSteel));
p.part("cross-rail-4", b("cross-rail-4", [165, 1320, 130], [1200, 0, 245]).color(structuralSteel));
p.part("clamp-block-0", b("clamp-block-0", [230, 280, 230], [-900, -620, 425]).color(safetyMarking));
p.part("clamp-block-1", b("clamp-block-1", [230, 280, 230], [0, -620, 425]).color(safetyMarking));
p.part("clamp-block-2", b("clamp-block-2", [230, 280, 230], [900, -620, 425]).color(safetyMarking));
p.part("clamp-block-3", b("clamp-block-3", [230, 280, 230], [-900, 620, 425]).color(safetyMarking));
p.part("clamp-block-4", b("clamp-block-4", [230, 280, 230], [0, 620, 425]).color(safetyMarking));
p.part("clamp-block-5", b("clamp-block-5", [230, 280, 230], [900, 620, 425]).color(safetyMarking));
p.part("datum-foot-0", b("datum-foot-0", [230, 220, 180], [-1350, -620, 90]).color(structuralSteel));
p.part("datum-foot-1", b("datum-foot-1", [230, 220, 180], [1350, -620, 90]).color(structuralSteel));
p.part("datum-foot-2", b("datum-foot-2", [230, 220, 180], [-1350, 620, 90]).color(structuralSteel));
p.part("datum-foot-3", b("datum-foot-3", [230, 220, 180], [1350, 620, 90]).color(structuralSteel));

return p.model();
