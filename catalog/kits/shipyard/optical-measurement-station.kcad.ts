// Optical measurement station: Portable optical measurement head on a tripod base with a hooded sensor, side handle, and target mast. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "optical-measurement-station",
  license: 'CC0-1.0',
  title: "Optical measurement station",
  description: "Portable optical measurement head on a tripod base with a hooded sensor, side handle, and target mast. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "optical", "measurement", "station"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#718780", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#8b9d97", "structuralSteel": "#d0d7d8", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#5e706a", "structuralSteel": "#828d91", "safetyMarking": "#bd8528"},
});

const p = assembly("optical-measurement-station");
const originOffsetMm = 40;

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

p.part("tripod-leg-0", b("tripod-leg-0", [120, 120, 980], [-420, -320, 450]).color(structuralSteel));
p.part("tripod-leg-1", b("tripod-leg-1", [120, 120, 980], [420, -320, 450]).color(structuralSteel));
p.part("tripod-leg-2", b("tripod-leg-2", [120, 120, 980], [0, 420, 450]).color(structuralSteel));
p.part("instrument-base", b("instrument-base", [580, 580, 180], [0, 0, 970]).color(yardPaint));
p.part("instrument-head", b("instrument-head", [720, 610, 540], [0, 0, 1330]).color(yardPaint));
p.part("optical-hood", b("optical-hood", [480, 440, 300], [0, -350, 1470]).color(yardPaint));
p.part("lens-ring", c("lens-ring", 100, 180, 14, [0, -520, 1470], [90, 0, 0], 90).color(safetyMarking));
p.part("side-handle", b("side-handle", [100, 540, 100], [440, 100, 1350]).color(structuralSteel));
p.part("target-mast", b("target-mast", [80, 80, 780], [0, 430, 1420]).color(safetyMarking));

return p.model();
