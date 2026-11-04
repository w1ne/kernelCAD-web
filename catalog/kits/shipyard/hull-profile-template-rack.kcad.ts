// Hull profile template rack: A-frame storage rack for reusable hull-section templates with separated bays, base rails, and end stops. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "hull-profile-template-rack",
  license: 'CC0-1.0',
  title: "Hull profile template rack",
  description: "A-frame storage rack for reusable hull-section templates with separated bays, base rails, and end stops. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "hull", "profile", "template", "rack"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#8f795e", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#a3917b", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#77644e", "structuralSteel": "#828d91"},
});

const p = assembly("hull-profile-template-rack");
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

p.part("base-runner-0", b("base-runner-0", [1950, 180, 160], [0, -500, 80]).color(yardPaint));
p.part("base-runner-1", b("base-runner-1", [1950, 180, 160], [0, 500, 80]).color(yardPaint));
p.part("divider-0", b("divider-0", [125, 1100, 1660], [-800, 0, 830]).color(yardPaint));
p.part("divider-1", b("divider-1", [125, 1100, 1660], [-400, 0, 830]).color(structuralSteel));
p.part("divider-2", b("divider-2", [125, 1100, 1660], [0, 0, 830]).color(structuralSteel));
p.part("divider-3", b("divider-3", [125, 1100, 1660], [400, 0, 830]).color(structuralSteel));
p.part("divider-4", b("divider-4", [125, 1100, 1660], [800, 0, 830]).color(structuralSteel));
p.part("template-0", b("template-0", [70, 860, 1320], [-800, 0, 1490]).color(structuralSteel));
p.part("template-1", b("template-1", [70, 860, 1320], [-400, 0, 1490]).color(structuralSteel));
p.part("template-2", b("template-2", [70, 860, 1320], [0, 0, 1490]).color(structuralSteel));
p.part("template-3", b("template-3", [70, 860, 1320], [400, 0, 1490]).color(structuralSteel));
p.part("top-restraint", b("top-restraint", [1780, 130, 130], [0, 0, 1710]).color(structuralSteel));
p.part("end-stop", b("end-stop", [120, 1050, 520], [960, 0, 420]).color(structuralSteel));

return p.model();
