// Paint curing air heater: Ducted industrial air heater on a skid with a fan cabinet, outlet plenum, and hose connection. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "paint-curing-air-heater",
  license: 'CC0-1.0',
  title: "Paint curing air heater",
  description: "Ducted industrial air heater on a skid with a fan cabinet, outlet plenum, and hose connection. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "paint", "curing", "air", "heater"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#a76845", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#b78366", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#8b5639", "structuralSteel": "#828d91"},
});

const p = assembly("paint-curing-air-heater");
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

p.part("heater-skid", b("heater-skid", [1700, 900, 140], [0, 0, 70]).color(structuralSteel));
p.part("fan-cabinet", b("fan-cabinet", [900, 840, 980], [-300, 0, 630]).color(yardPaint));
p.part("outlet-plenum", b("outlet-plenum", [720, 720, 420], [530, 0, 1050]).color(structuralSteel));
p.part("duct-collar", b("duct-collar", [300, 300, 230], [530, 0, 1380]).color(yardPaint));
p.part("fan-grille-spoke-0", c("fan-grille-spoke-0", 50, 330, 12, [-300, -440, 680], [90, 0, 0], 90).color(structuralSteel));
p.part("service-panel", b("service-panel", [540, 60, 700], [-300, -460, 630]).color(yardPaint));
p.part("foot-0", b("foot-0", [170, 180, 160], [-650, -320, 80]).color(structuralSteel));
p.part("foot-1", b("foot-1", [170, 180, 160], [650, -320, 80]).color(structuralSteel));
p.part("foot-2", b("foot-2", [170, 180, 160], [-650, 320, 80]).color(structuralSteel));
p.part("foot-3", b("foot-3", [170, 180, 160], [650, 320, 80]).color(structuralSteel));

return p.model();
