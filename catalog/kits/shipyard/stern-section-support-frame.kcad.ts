// Stern section support frame: Portal-style hull support with two adjustable towers, tie beam, lower braces, and paired padded contact plates. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "stern-section-support-frame",
  license: 'CC0-1.0',
  title: "Stern section support frame",
  description: "Portal-style hull support with two adjustable towers, tie beam, lower braces, and paired padded contact plates. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "stern", "section", "support", "frame"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#667c78", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#829490", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#556764", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("stern-section-support-frame");
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

p.part("left-base", b("left-base", [420, 520, 180], [-850, 0, 90]).color(yardPaint));
p.part("right-base", b("right-base", [420, 520, 180], [850, 0, 90]).color(yardPaint));
p.part("tower-0", b("tower-0", [230, 260, 1520], [-850, 0, 940]).color(structuralSteel));
p.part("tower-1", b("tower-1", [230, 260, 1520], [850, 0, 940]).color(structuralSteel));
p.part("crosshead", b("crosshead", [2200, 350, 200], [0, 0, 1740]).color(yardPaint));
p.part("lower-tie", b("lower-tie", [1730, 180, 150], [0, 220, 560]).color(structuralSteel));
p.part("contact-pad-0", b("contact-pad-0", [480, 260, 170], [-650, -45, 1900]).color(elastomer));
p.part("contact-pad-1", b("contact-pad-1", [480, 260, 170], [650, -45, 1900]).color(elastomer));
p.part("tower-foot-brace-0", b("tower-foot-brace-0", [160, 180, 720], [-690, 150, 500]).color(structuralSteel));
p.part("tower-foot-brace-1", b("tower-foot-brace-1", [160, 180, 720], [690, 150, 500]).color(structuralSteel));

return p.model();
