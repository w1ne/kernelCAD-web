// Plate roller conveyor: Section of plate feed line with a heavy frame, transverse rollers, side guides, and adjustable feet. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "plate-roller-conveyor",
  license: 'CC0-1.0',
  title: "Plate roller conveyor",
  description: "Section of plate feed line with a heavy frame, transverse rollers, side guides, and adjustable feet. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate", "roller", "conveyor"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#78847e", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#909a95", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#646e69", "structuralSteel": "#828d91"},
});

const p = assembly("plate-roller-conveyor");
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

p.part("side-frame-0", b("side-frame-0", [2550, 140, 280], [0, -680, 140]).color(yardPaint));
p.part("side-frame-1", b("side-frame-1", [2550, 140, 280], [0, 680, 140]).color(structuralSteel));
p.part("feed-roller-0", c("feed-roller-0", 115, 115, 10, [-1000, 0, 300], [90, 0, 0], 90).color(structuralSteel));
p.part("feed-roller-1", c("feed-roller-1", 115, 115, 10, [-600, 0, 300], [90, 0, 0], 90).color(structuralSteel));
p.part("feed-roller-2", c("feed-roller-2", 115, 115, 10, [-200, 0, 300], [90, 0, 0], 90).color(structuralSteel));
p.part("feed-roller-3", c("feed-roller-3", 115, 115, 10, [200, 0, 300], [90, 0, 0], 90).color(structuralSteel));
p.part("feed-roller-4", c("feed-roller-4", 115, 115, 10, [600, 0, 300], [90, 0, 0], 90).color(structuralSteel));
p.part("feed-roller-5", c("feed-roller-5", 115, 115, 10, [1000, 0, 300], [90, 0, 0], 90).color(structuralSteel));
p.part("guide-rail-0", b("guide-rail-0", [2350, 100, 230], [0, -720, 460]).color(structuralSteel));
p.part("guide-rail-1", b("guide-rail-1", [2350, 100, 230], [0, 720, 460]).color(structuralSteel));
p.part("leveling-foot-0", b("leveling-foot-0", [160, 160, 100], [-1100, -650, 50]).color(structuralSteel));
p.part("leveling-foot-1", b("leveling-foot-1", [160, 160, 100], [1100, -650, 50]).color(structuralSteel));
p.part("leveling-foot-2", b("leveling-foot-2", [160, 160, 100], [-1100, 650, 50]).color(structuralSteel));
p.part("leveling-foot-3", b("leveling-foot-3", [160, 160, 100], [1100, 650, 50]).color(structuralSteel));

return p.model();
