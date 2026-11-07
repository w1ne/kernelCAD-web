// Caisson ballast manifold stand: Pipework display skid with a header, four branch valves, support feet, and a drain receiver. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "caisson-ballast-manifold-stand",
  license: 'CC0-1.0',
  title: "Caisson ballast manifold stand",
  description: "Pipework display skid with a header, four branch valves, support feet, and a drain receiver. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "caisson", "ballast", "manifold", "stand"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#67847e", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#829a95", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#556e69", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("caisson-ballast-manifold-stand");
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
const ngon = (r: number, sides: number, rotation = 0) => {
  let profile = path().moveTo(r * Math.cos(rotation), r * Math.sin(rotation));
  for (let i = 1; i < sides; i++) {
    const angle = rotation + 2 * Math.PI * i / sides;
    profile = profile.lineTo(r * Math.cos(angle), r * Math.sin(angle));
  }
  return profile.close();
};
const profiledCylinder = (h: number, r: number, sides: number, name: string, profileAngle: number) => {
  const lower = /hopper|funnel|cone|diffuser/i.test(name) ? r * 0.62 : r * 0.94;
  return ngon(lower, sides, profileAngle).loft(ngon(r, sides, profileAngle), { spacing: h, ruled: true });
};
const c = (name: string, h: number, r: number, sides: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  const profileAngle = axis?.[0] ? Math.PI / 2 : 0;
  let shape = profiledCylinder(h, r, sides, name, profileAngle);
  if (axis && degrees) {
    if (axis[0]) shape = shape.rotateX(degrees);
    else if (axis[1]) shape = shape.rotateY(degrees);
    else if (axis[2]) shape = shape.rotateZ(degrees);
  }
  return shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
};

p.part("base-skid", b("base-skid", [1900, 700, 130], [0, 0, 65]).color(yardPaint));
p.part("header-pipe", b("header-pipe", [1540, 160, 160], [0, 0, 1110]).color(structuralSteel));
p.part("branch-pipe-0", b("branch-pipe-0", [150, 150, 760], [-570, 0, 670]).color(structuralSteel));
p.part("branch-pipe-1", b("branch-pipe-1", [150, 150, 760], [-190, 0, 670]).color(structuralSteel));
p.part("branch-pipe-2", b("branch-pipe-2", [150, 150, 760], [190, 0, 670]).color(structuralSteel));
p.part("branch-pipe-3", b("branch-pipe-3", [150, 150, 760], [570, 0, 670]).color(structuralSteel));
p.part("handwheel-0", c("handwheel-0", 55, 145, 12, [-570, -110, 1010], [90, 0, 0], 90).color(elastomer));
p.part("handwheel-1", c("handwheel-1", 55, 145, 12, [-190, -110, 1010], [90, 0, 0], 90).color(elastomer));
p.part("handwheel-2", c("handwheel-2", 55, 145, 12, [190, -110, 1010], [90, 0, 0], 90).color(elastomer));
p.part("handwheel-3", c("handwheel-3", 55, 145, 12, [570, -110, 1010], [90, 0, 0], 90).color(elastomer));
p.part("support-foot-0", b("support-foot-0", [130, 130, 900], [-760, -220, 520]).color(structuralSteel));
p.part("support-foot-1", b("support-foot-1", [130, 130, 900], [760, -220, 520]).color(structuralSteel));
p.part("support-foot-2", b("support-foot-2", [130, 130, 900], [-760, 220, 520]).color(structuralSteel));
p.part("support-foot-3", b("support-foot-3", [130, 130, 900], [760, 220, 520]).color(structuralSteel));
p.part("drain-receiver", b("drain-receiver", [440, 500, 370], [760, 0, 250]).color(structuralSteel));

return p.model();
