// Vessel refit job board: Freestanding job-status board with a wheeled base, framed planning panel, magnetic columns, and document tray. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "vessel-refit-job-board",
  license: 'CC0-1.0',
  title: "Vessel refit job board",
  description: "Freestanding job-status board with a wheeled base, framed planning panel, magnetic columns, and document tray. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "vessel", "job", "board"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#73847d", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#8c9a94", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#5f6e68", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("vessel-refit-job-board");
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

p.part("board-frame", b("board-frame", [1700, 140, 1320], [0, 0, 1700]).color(yardPaint));
p.part("planning-panel", b("planning-panel", [1540, 90, 1100], [0, -95, 1700]).color(yardPaint));
p.part("column-divider-0", b("column-divider-0", [45, 55, 1040], [-520, -150, 1700]).color(structuralSteel));
p.part("column-divider-1", b("column-divider-1", [45, 55, 1040], [0, -150, 1700]).color(structuralSteel));
p.part("column-divider-2", b("column-divider-2", [45, 55, 1040], [520, -150, 1700]).color(structuralSteel));
p.part("header-rail", b("header-rail", [1600, 120, 120], [0, -110, 2300]).color(structuralSteel));
p.part("document-tray", b("document-tray", [1200, 360, 120], [0, -210, 990]).color(structuralSteel));
p.part("support-post-0", b("support-post-0", [100, 100, 1060], [-650, 0, 530]).color(structuralSteel));
p.part("support-post-1", b("support-post-1", [100, 100, 1060], [650, 0, 530]).color(structuralSteel));
p.part("board-wheel-0", c("board-wheel-0", 80, 100, 8, [-650, -175, 100], [90, 0, 0], 90).color(elastomer));
p.part("board-wheel-1", c("board-wheel-1", 80, 100, 8, [650, -175, 100], [90, 0, 0], 90).color(elastomer));
p.part("board-wheel-2", c("board-wheel-2", 80, 100, 8, [-650, 175, 100], [90, 0, 0], 90).color(elastomer));
p.part("board-wheel-3", c("board-wheel-3", 80, 100, 8, [650, 175, 100], [90, 0, 0], 90).color(elastomer));
p.part("frame-foot-0", b("frame-foot-0", [720, 420, 110], [-650, 0, 55]).color(structuralSteel));
p.part("frame-foot-1", b("frame-foot-1", [720, 420, 110], [650, 0, 55]).color(structuralSteel));

return p.model();
