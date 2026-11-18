// Mobile hull access platform: Low rolling work deck with adjustable-height posts, guard rails, end stops, and a central access step. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "mobile-hull-access-platform",
  license: 'CC0-1.0',
  title: "Mobile hull access platform",
  description: "Low rolling work deck with adjustable-height posts, guard rails, end stops, and a central access step. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "mobile", "hull", "access", "platform"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#71847e", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#8b9a95", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#5e6e69", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("mobile-hull-access-platform");
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

p.part("deck", b("deck", [1760, 1080, 150], [0, 0, 660]).color(yardPaint));
p.part("lift-post-0", b("lift-post-0", [120, 120, 560], [-700, -400, 300]).color(structuralSteel));
p.part("lift-post-1", b("lift-post-1", [120, 120, 560], [700, -400, 300]).color(structuralSteel));
p.part("lift-post-2", b("lift-post-2", [120, 120, 560], [-700, 400, 300]).color(structuralSteel));
p.part("lift-post-3", b("lift-post-3", [120, 120, 560], [700, 400, 300]).color(structuralSteel));
p.part("guard-post-0", b("guard-post-0", [80, 80, 620], [-700, -400, 1045]).color(structuralSteel));
p.part("guard-post-1", b("guard-post-1", [80, 80, 620], [0, -400, 1045]).color(structuralSteel));
p.part("guard-post-2", b("guard-post-2", [80, 80, 620], [700, -400, 1045]).color(structuralSteel));
p.part("guard-post-3", b("guard-post-3", [80, 80, 620], [-700, 400, 1045]).color(structuralSteel));
p.part("guard-post-4", b("guard-post-4", [80, 80, 620], [0, 400, 1045]).color(structuralSteel));
p.part("guard-post-5", b("guard-post-5", [80, 80, 620], [700, 400, 1045]).color(structuralSteel));
p.part("guard-rail-0", b("guard-rail-0", [700, 65, 75], [-350, -400, 1300]).color(structuralSteel));
p.part("guard-rail-1", b("guard-rail-1", [700, 65, 75], [350, -400, 1300]).color(structuralSteel));
p.part("guard-rail-2", b("guard-rail-2", [700, 65, 75], [-350, 400, 1300]).color(structuralSteel));
p.part("guard-rail-3", b("guard-rail-3", [700, 65, 75], [350, 400, 1300]).color(structuralSteel));
p.part("wheel-0", c("wheel-0", 110, 150, 10, [-750, -460, 150], [90, 0, 0], 90).color(elastomer));
p.part("wheel-1", c("wheel-1", 110, 150, 10, [750, -460, 150], [90, 0, 0], 90).color(elastomer));
p.part("wheel-2", c("wheel-2", 110, 150, 10, [-750, 460, 150], [90, 0, 0], 90).color(elastomer));
p.part("wheel-3", c("wheel-3", 110, 150, 10, [750, 460, 150], [90, 0, 0], 90).color(elastomer));
p.part("access-step", b("access-step", [620, 330, 130], [0, -680, 65]).color(structuralSteel));

return p.model();
