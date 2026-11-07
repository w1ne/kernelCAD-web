// Drydock level reference post: Floor-mounted reference mast with a wide foot, graduated cross bars, a weather hood, and a float indicator. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "drydock-level-reference-post",
  license: 'CC0-1.0',
  title: "Drydock level reference post",
  description: "Floor-mounted reference mast with a wide foot, graduated cross bars, a weather hood, and a float indicator. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "level", "reference", "post"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#d2a64f", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#dab66f", "structuralSteel": "#d0d7d8", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#ae8a42", "structuralSteel": "#828d91", "safetyMarking": "#bd8528"},
});

const p = assembly("drydock-level-reference-post");
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

p.part("base-plate", b("base-plate", [700, 620, 120], [0, 0, 60]).color(structuralSteel));
p.part("mast", b("mast", [150, 160, 2570], [0, 0, 1405]).color(yardPaint));
p.part("graduation-0", b("graduation-0", [430, 70, 45], [0, -45, 300]).color(safetyMarking));
p.part("graduation-1", b("graduation-1", [270, 70, 45], [0, -45, 450]).color(safetyMarking));
p.part("graduation-2", b("graduation-2", [270, 70, 45], [0, -45, 600]).color(safetyMarking));
p.part("graduation-3", b("graduation-3", [270, 70, 45], [0, -45, 750]).color(safetyMarking));
p.part("graduation-4", b("graduation-4", [430, 70, 45], [0, -45, 900]).color(safetyMarking));
p.part("graduation-5", b("graduation-5", [270, 70, 45], [0, -45, 1050]).color(safetyMarking));
p.part("graduation-6", b("graduation-6", [270, 70, 45], [0, -45, 1200]).color(safetyMarking));
p.part("graduation-7", b("graduation-7", [270, 70, 45], [0, -45, 1350]).color(safetyMarking));
p.part("graduation-8", b("graduation-8", [430, 70, 45], [0, -45, 1500]).color(safetyMarking));
p.part("graduation-9", b("graduation-9", [270, 70, 45], [0, -45, 1650]).color(safetyMarking));
p.part("graduation-10", b("graduation-10", [270, 70, 45], [0, -45, 1800]).color(safetyMarking));
p.part("graduation-11", b("graduation-11", [270, 70, 45], [0, -45, 1950]).color(safetyMarking));
p.part("graduation-12", b("graduation-12", [430, 70, 45], [0, -45, 2100]).color(safetyMarking));
p.part("graduation-13", b("graduation-13", [270, 70, 45], [0, -45, 2250]).color(safetyMarking));
p.part("top-hood", b("top-hood", [520, 380, 120], [0, 0, 2760]).color(yardPaint));
p.part("float-indicator", c("float-indicator", 130, 95, 12, [0, 0, 2900]).color(safetyMarking));

return p.model();
