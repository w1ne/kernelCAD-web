// Dock gate winch base: Drive stand for a floating-gate hauling line with twin cable drums, a motor housing, a brake lever, and a reinforced skid. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "dock-gate-winch-base",
  license: 'CC0-1.0',
  title: "Dock gate winch base",
  description: "Drive stand for a floating-gate hauling line with twin cable drums, a motor housing, a brake lever, and a reinforced skid. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "dock", "gate", "winch", "base"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#a56848", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#b58369", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#89563c", "structuralSteel": "#828d91"},
});

const p = assembly("dock-gate-winch-base");
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

p.part("skid", b("skid", [1900, 980, 180], [0, 0, 90]).color(yardPaint));
p.part("motor", b("motor", [620, 620, 650], [570, 0, 505]).color(yardPaint));
p.part("haul-drum-0", c("haul-drum-0", 560, 260, 14, [-500, -390, 340], [90, 0, 0], 90).color(yardPaint));
p.part("haul-drum-1", c("haul-drum-1", 560, 260, 14, [-500, 390, 340], [90, 0, 0], 90).color(yardPaint));
p.part("drum-bearing-0", b("drum-bearing-0", [180, 200, 680], [-500, -610, 440]).color(structuralSteel));
p.part("drum-bearing-1", b("drum-bearing-1", [180, 200, 680], [-500, 610, 440]).color(structuralSteel));
p.part("brake-lever", b("brake-lever", [75, 720, 75], [-160, 360, 660]).color(yardPaint));
p.part("guard-cover", b("guard-cover", [720, 260, 120], [-500, 0, 780]).color(yardPaint));

return p.model();
