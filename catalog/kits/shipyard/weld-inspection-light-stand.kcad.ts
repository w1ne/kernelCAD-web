// Weld inspection light stand: Portable inspection light with a weighted base, height mast, twin lamp heads, and a cable hook. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "weld-inspection-light-stand",
  license: 'CC0-1.0',
  title: "Weld inspection light stand",
  description: "Portable inspection light with a weighted base, height mast, twin lamp heads, and a cable hook. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "weld", "inspection", "light", "stand"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#d2a64c", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#dab66c", "structuralSteel": "#d0d7d8", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#ae8a3f", "structuralSteel": "#828d91", "safetyMarking": "#bd8528"},
});

const p = assembly("weld-inspection-light-stand");
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

p.part("weighted-base", b("weighted-base", [620, 620, 170], [0, 0, 85]).color(yardPaint));
p.part("mast", b("mast", [100, 100, 1560], [0, 0, 950]).color(structuralSteel));
p.part("crossbar", b("crossbar", [900, 120, 100], [0, 0, 1750]).color(structuralSteel));
p.part("lamp-head-0", b("lamp-head-0", [320, 230, 280], [-280, 0, 1620]).color(safetyMarking));
p.part("lamp-head-1", b("lamp-head-1", [320, 230, 280], [280, 0, 1620]).color(safetyMarking));
p.part("lamp-lens-0", b("lamp-lens-0", [220, 50, 190], [-280, -130, 1620]).color(safetyMarking));
p.part("lamp-lens-1", b("lamp-lens-1", [220, 50, 190], [280, -130, 1620]).color(safetyMarking));
p.part("cable-hook", b("cable-hook", [90, 330, 80], [120, 140, 1240]).color(structuralSteel));
p.part("carry-handle", b("carry-handle", [320, 80, 100], [0, 0, 1860]).color(structuralSteel));

return p.model();
