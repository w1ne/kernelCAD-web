// Temporary work light mast: Portable telescoping light mast on a stabilizing base with a four-lamp head and cable hook. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "temporary-work-light-mast",
  license: 'CC0-1.0',
  title: "Temporary work light mast",
  description: "Portable telescoping light mast on a stabilizing base with a four-lamp head and cable hook. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "temporary", "work", "light", "mast"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#d5a951", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#ddb870", "structuralSteel": "#d0d7d8", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#b18c43", "structuralSteel": "#828d91", "safetyMarking": "#bd8528"},
});

const p = assembly("temporary-work-light-mast");
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

p.part("base-foot", b("base-foot", [760, 760, 150], [0, 0, 75]).color(yardPaint));
p.part("mast-lower", b("mast-lower", [140, 140, 1750], [0, 0, 1025]).color(structuralSteel));
p.part("mast-upper", b("mast-upper", [100, 100, 1400], [0, 0, 2600]).color(structuralSteel));
p.part("lamp-bar", b("lamp-bar", [1050, 140, 120], [0, 0, 3260]).color(safetyMarking));
p.part("lamp-0", b("lamp-0", [190, 180, 250], [-390, -70, 3060]).color(safetyMarking));
p.part("lamp-1", b("lamp-1", [190, 180, 250], [-130, -70, 3060]).color(safetyMarking));
p.part("lamp-2", b("lamp-2", [190, 180, 250], [130, -70, 3060]).color(safetyMarking));
p.part("lamp-3", b("lamp-3", [190, 180, 250], [390, -70, 3060]).color(safetyMarking));
p.part("stabilizer-0", b("stabilizer-0", [700, 120, 90], [-520, 0, 45]).color(yardPaint));
p.part("stabilizer-1", b("stabilizer-1", [700, 120, 90], [520, 0, 45]).color(yardPaint));
p.part("stabilizer-2", b("stabilizer-2", [700, 120, 90], [0, -520, 45]).color(yardPaint));
p.part("stabilizer-3", b("stabilizer-3", [700, 120, 90], [0, 520, 45]).color(yardPaint));
p.part("cable-hook", b("cable-hook", [120, 120, 310], [170, 180, 1750]).color(structuralSteel));

return p.model();
