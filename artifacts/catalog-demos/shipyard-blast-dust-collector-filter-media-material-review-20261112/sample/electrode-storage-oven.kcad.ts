// Electrode storage oven: Shop-floor cabinet oven with insulated body, double doors, control panel, ventilation cap, and rack feet. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "electrode-storage-oven",
  license: 'CC0-1.0',
  title: "Electrode storage oven",
  description: "Shop-floor cabinet oven with insulated body, double doors, control panel, ventilation cap, and rack feet. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "electrode", "storage", "oven"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#9b7454", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#ad8d73", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#816046", "structuralSteel": "#828d91"},
});

const p = assembly("electrode-storage-oven");
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

p.part("cabinet", b("cabinet", [1120, 780, 1540], [0, 0, 830]).color(yardPaint));
p.part("toe-kick", b("toe-kick", [1180, 840, 150], [0, 0, 75]).color(yardPaint));
p.part("oven-door-0", b("oven-door-0", [510, 55, 1280], [-270, -420, 880]).color(yardPaint));
p.part("oven-door-1", b("oven-door-1", [510, 55, 1280], [270, -420, 880]).color(yardPaint));
p.part("control-panel", b("control-panel", [240, 80, 520], [610, -430, 900]).color(yardPaint));
p.part("vent-cap", b("vent-cap", [360, 420, 160], [0, 0, 1680]).color(structuralSteel));
p.part("rack-foot-0", b("rack-foot-0", [120, 130, 240], [-430, -280, 190]).color(structuralSteel));
p.part("rack-foot-1", b("rack-foot-1", [120, 130, 240], [430, -280, 190]).color(structuralSteel));
p.part("rack-foot-2", b("rack-foot-2", [120, 130, 240], [-430, 280, 190]).color(structuralSteel));
p.part("rack-foot-3", b("rack-foot-3", [120, 130, 240], [430, 280, 190]).color(structuralSteel));

return p.model();
