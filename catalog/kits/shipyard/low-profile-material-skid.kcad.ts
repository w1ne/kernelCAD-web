// Low-profile material skid: Reinforced ground skid with deck beams, lifting eyes, corner bumpers, and a replaceable wear plate. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "low-profile-material-skid",
  license: 'CC0-1.0',
  title: "Low-profile material skid",
  description: "Reinforced ground skid with deck beams, lifting eyes, corner bumpers, and a replaceable wear plate. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "low-profile", "material", "skid"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#75847a", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#8e9a92", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#616e65", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("low-profile-material-skid");
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

p.part("wear-plate", b("wear-plate", [2180, 1420, 100], [0, 0, 50]).color(yardPaint));
p.part("deck-beam-0", b("deck-beam-0", [190, 1320, 220], [-800, 0, 210]).color(structuralSteel));
p.part("deck-beam-1", b("deck-beam-1", [190, 1320, 220], [0, 0, 210]).color(structuralSteel));
p.part("deck-beam-2", b("deck-beam-2", [190, 1320, 220], [800, 0, 210]).color(structuralSteel));
p.part("lifting-eye-0", b("lifting-eye-0", [180, 160, 440], [-940, -570, 510]).color(yardPaint));
p.part("lifting-eye-1", b("lifting-eye-1", [180, 160, 440], [940, -570, 510]).color(yardPaint));
p.part("lifting-eye-2", b("lifting-eye-2", [180, 160, 440], [-940, 570, 510]).color(yardPaint));
p.part("lifting-eye-3", b("lifting-eye-3", [180, 160, 440], [940, 570, 510]).color(yardPaint));
p.part("corner-bumper-0", b("corner-bumper-0", [260, 260, 260], [-1020, -650, 230]).color(elastomer));
p.part("corner-bumper-1", b("corner-bumper-1", [260, 260, 260], [1020, -650, 230]).color(elastomer));
p.part("corner-bumper-2", b("corner-bumper-2", [260, 260, 260], [-1020, 650, 230]).color(elastomer));
p.part("corner-bumper-3", b("corner-bumper-3", [260, 260, 260], [1020, 650, 230]).color(elastomer));

return p.model();
