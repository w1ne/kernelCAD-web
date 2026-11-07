// Alignment target stand: Compact positioning stand with a tripod-like base, adjustable upright, target plate, and crosshair bezel. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "alignment-target-stand",
  license: 'CC0-1.0',
  title: "Alignment target stand",
  description: "Compact positioning stand with a tripod-like base, adjustable upright, target plate, and crosshair bezel. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "alignment", "target", "stand"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#d1a84e", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#d9b86e", "structuralSteel": "#d0d7d8", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#ad8b41", "structuralSteel": "#828d91", "safetyMarking": "#bd8528"},
});

const p = assembly("alignment-target-stand");
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

p.part("base-foot", b("base-foot", [720, 720, 110], [0, 0, 55]).color(yardPaint));
p.part("upright", b("upright", [100, 100, 1260], [0, 0, 685]).color(structuralSteel));
p.part("target-plate", b("target-plate", [620, 100, 620], [0, -35, 1390]).color(safetyMarking));
p.part("target-center", b("target-center", [250, 80, 250], [0, -100, 1390]).color(safetyMarking));
p.part("crosshair-0", b("crosshair-0", [430, 35, 35], [0, -150, 1260]).color(safetyMarking));
p.part("crosshair-1", b("crosshair-1", [430, 35, 35], [0, -150, 1520]).color(safetyMarking));
p.part("tripod-foot-0", b("tripod-foot-0", [600, 160, 100], [-430, -330, 50]).color(structuralSteel));
p.part("tripod-foot-1", b("tripod-foot-1", [600, 160, 100], [430, -330, 50]).color(structuralSteel));
p.part("tripod-foot-2", b("tripod-foot-2", [600, 160, 100], [0, 430, 50]).color(structuralSteel));

return p.model();
