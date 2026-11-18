// Portable ventilation fan: Axial ventilation fan in a square carry frame with a circular hub, four broad blades, and a floor stand. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "portable-ventilation-fan",
  license: 'CC0-1.0',
  title: "Portable ventilation fan",
  description: "Axial ventilation fan in a square carry frame with a circular hub, four broad blades, and a floor stand. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "portable", "ventilation", "fan"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#708984", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#8a9e9a", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5d726e", "structuralSteel": "#828d91"},
});

const p = assembly("portable-ventilation-fan");
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

p.part("fan-frame", b("fan-frame", [1180, 220, 1180], [0, 0, 710]).color(yardPaint));
p.part("fan-hub", c("fan-hub", 200, 230, 14, [0, -170, 710], [90, 0, 0], 90).color(structuralSteel));
p.part("fan-blade-0", b("fan-blade-0", [480, 100, 150], [0, -185, 1000]).color(yardPaint));
p.part("fan-blade-1", b("fan-blade-1", [480, 100, 150], [0, -185, 420]).color(yardPaint));
p.part("fan-blade-2", b("fan-blade-2", [480, 100, 150], [-290, -185, 710]).color(yardPaint));
p.part("fan-blade-3", b("fan-blade-3", [480, 100, 150], [290, -185, 710]).color(yardPaint));
p.part("stand-leg-0", b("stand-leg-0", [130, 130, 390], [-430, -350, 195]).color(structuralSteel));
p.part("stand-leg-1", b("stand-leg-1", [130, 130, 390], [430, -350, 195]).color(structuralSteel));
p.part("stand-leg-2", b("stand-leg-2", [130, 130, 390], [-430, 350, 195]).color(structuralSteel));
p.part("stand-leg-3", b("stand-leg-3", [130, 130, 390], [430, 350, 195]).color(structuralSteel));
p.part("carry-handle", b("carry-handle", [320, 80, 90], [0, 0, 1370]).color(structuralSteel));

return p.model();
