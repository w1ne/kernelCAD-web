// Bow section support stand: Reusable steel cradle with paired inclined-looking uprights, a high cross head, base shoes, and a broad saddle pad. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "bow-section-support-stand",
  license: 'CC0-1.0',
  title: "Bow section support stand",
  description: "Reusable steel cradle with paired inclined-looking uprights, a high cross head, base shoes, and a broad saddle pad. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "bow", "section", "support", "stand"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#7b8980", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#939e97", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#66726a", "structuralSteel": "#828d91"},
});

const p = assembly("bow-section-support-stand");
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

p.part("base-beam", b("base-beam", [1900, 520, 180], [0, 0, 90]).color(yardPaint));
p.part("left-foot", b("left-foot", [260, 440, 120], [-650, 0, 240]).color(structuralSteel));
p.part("right-foot", b("right-foot", [260, 440, 120], [650, 0, 240]).color(structuralSteel));
p.part("left-post", b("left-post", [190, 240, 1130], [-620, 0, 825]).color(structuralSteel));
p.part("right-post", b("right-post", [190, 240, 1130], [620, 0, 825]).color(structuralSteel));
p.part("head-beam", b("head-beam", [1650, 330, 220], [0, 0, 1390]).color(structuralSteel));
p.part("saddle", b("saddle", [1050, 760, 150], [0, 0, 1575]).color(structuralSteel));
p.part("rear-brace", b("rear-brace", [1350, 150, 130], [0, 220, 810]).color(structuralSteel));

return p.model();
