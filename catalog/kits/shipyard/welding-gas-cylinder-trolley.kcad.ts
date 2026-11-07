// Welding gas cylinder trolley: Two-cylinder shop trolley with retaining straps, wheel guard, pull handle, and a low toe plate. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "welding-gas-cylinder-trolley",
  license: 'CC0-1.0',
  title: "Welding gas cylinder trolley",
  description: "Two-cylinder shop trolley with retaining straps, wheel guard, pull handle, and a low toe plate. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "welding", "gas", "cylinder", "trolley"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#759084", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#8ea49a", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#61786e", "structuralSteel": "#828d91", "elastomer": "#252b2d", "safetyMarking": "#bd8528"},
});

const p = assembly("welding-gas-cylinder-trolley");
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

p.part("toe-plate", b("toe-plate", [680, 500, 130], [0, 0, 65]).color(structuralSteel));
p.part("gas-cylinder-0", c("gas-cylinder-0", 1320, 210, 12, [-200, 0, 130]).color(yardPaint));
p.part("gas-cylinder-1", c("gas-cylinder-1", 1320, 210, 12, [200, 0, 130]).color(yardPaint));
p.part("retaining-band-0", b("retaining-band-0", [650, 130, 80], [0, -225, 560]).color(safetyMarking));
p.part("retaining-band-1", b("retaining-band-1", [650, 130, 80], [0, -225, 1040]).color(safetyMarking));
p.part("trolley-wheel-0", c("trolley-wheel-0", 90, 230, 12, [-420, 0, 230], [0, 90, 0], 90).color(elastomer));
p.part("trolley-wheel-1", c("trolley-wheel-1", 90, 230, 12, [420, 0, 230], [0, 90, 0], 90).color(elastomer));
p.part("pull-handle", b("pull-handle", [90, 110, 1180], [-480, 0, 930]).color(structuralSteel));
p.part("top-grip", b("top-grip", [100, 660, 100], [-480, 0, 1510]).color(elastomer));
p.part('cylinder-valve-neck-0', c('cylinder-valve-neck-0', 90, 72, 8, [-200, 0, 1438]).color(structuralSteel));
p.part('cylinder-valve-handle-0', b('cylinder-valve-handle-0', [210, 42, 32], [-200, 0, 1535]).color(structuralSteel));
p.part('cylinder-valve-neck-1', c('cylinder-valve-neck-1', 90, 72, 8, [200, 0, 1438]).color(structuralSteel));
p.part('cylinder-valve-handle-1', b('cylinder-valve-handle-1', [210, 42, 32], [200, 0, 1535]).color(structuralSteel));

return p.model();
