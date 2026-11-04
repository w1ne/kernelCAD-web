// Confined-space rescue tripod: Portable access tripod with three feet, a head bridge, a winch housing, and a suspended retrieval line. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "confined-space-rescue-tripod",
  license: 'CC0-1.0',
  title: "Confined-space rescue tripod",
  description: "Portable access tripod with three feet, a head bridge, a winch housing, and a suspended retrieval line. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "confined-space", "rescue", "tripod"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#d19f45", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#d9b066", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#ad8439", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("confined-space-rescue-tripod");
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

p.part("tripod-leg-0", b("tripod-leg-0", [130, 130, 1940], [-650, -500, 970]).color(structuralSteel));
p.part("tripod-leg-1", b("tripod-leg-1", [130, 130, 1940], [650, -500, 970]).color(structuralSteel));
p.part("tripod-leg-2", b("tripod-leg-2", [130, 130, 1940], [0, 650, 970]).color(structuralSteel));
p.part("head-bridge", b("head-bridge", [1380, 180, 180], [0, 0, 1980]).color(structuralSteel));
p.part("winch-housing", b("winch-housing", [430, 330, 420], [0, -100, 1680]).color(yardPaint));
p.part("retrieval-drum", c("retrieval-drum", 340, 150, 12, [0, -280, 1660], [90, 0, 0], 90).color(yardPaint));
p.part("retrieval-line", b("retrieval-line", [60, 60, 1440], [0, -280, 880]).color(yardPaint));
p.part("foot-pad-0", b("foot-pad-0", [360, 280, 110], [-650, -500, 55]).color(elastomer));
p.part("foot-pad-1", b("foot-pad-1", [360, 280, 110], [650, -500, 55]).color(elastomer));
p.part("foot-pad-2", b("foot-pad-2", [360, 280, 110], [0, 650, 55]).color(elastomer));

return p.model();
