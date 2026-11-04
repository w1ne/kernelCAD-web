// Keel section fit-up jig: Low alignment bed with parallel keel rails, spacing blocks, datum stops, and removable reference towers. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "keel-section-fit-up-jig",
  license: 'CC0-1.0',
  title: "Keel section fit-up jig",
  description: "Low alignment bed with parallel keel rails, spacing blocks, datum stops, and removable reference towers. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "keel", "section", "fit-up", "jig"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#708079", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#8a9791", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5d6a64", "structuralSteel": "#828d91"},
});

const p = assembly("keel-section-fit-up-jig");
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

p.part("keel-rail-0", b("keel-rail-0", [2900, 220, 260], [0, -520, 130]).color(yardPaint));
p.part("keel-rail-1", b("keel-rail-1", [2900, 220, 260], [0, 520, 130]).color(structuralSteel));
p.part("spacing-block-0", b("spacing-block-0", [250, 300, 360], [-950, 0, 440]).color(structuralSteel));
p.part("spacing-block-1", b("spacing-block-1", [250, 300, 360], [-320, 0, 440]).color(structuralSteel));
p.part("spacing-block-2", b("spacing-block-2", [250, 300, 360], [320, 0, 440]).color(structuralSteel));
p.part("spacing-block-3", b("spacing-block-3", [250, 300, 360], [950, 0, 440]).color(structuralSteel));
p.part("end-stop-0", b("end-stop-0", [170, 1280, 540], [-1400, 0, 670]).color(structuralSteel));
p.part("end-stop-1", b("end-stop-1", [170, 1280, 540], [1400, 0, 670]).color(structuralSteel));
p.part("reference-tower-0", b("reference-tower-0", [140, 140, 920], [-1150, -520, 720]).color(structuralSteel));
p.part("reference-tower-1", b("reference-tower-1", [140, 140, 920], [-1150, 520, 720]).color(structuralSteel));
p.part("reference-tower-2", b("reference-tower-2", [140, 140, 920], [1150, -520, 720]).color(structuralSteel));
p.part("reference-tower-3", b("reference-tower-3", [140, 140, 920], [1150, 520, 720]).color(structuralSteel));

return p.model();
