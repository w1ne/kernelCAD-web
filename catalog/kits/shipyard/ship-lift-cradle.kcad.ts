// Ship lift cradle: Transfer cradle with paired guide rails, cross ties, adjustable hull pads, and four guide rollers. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "ship-lift-cradle",
  license: 'CC0-1.0',
  title: "Ship lift cradle",
  description: "Transfer cradle with paired guide rails, cross ties, adjustable hull pads, and four guide rollers. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "ship", "lift", "cradle"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#76847b", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#8f9a93", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#626e66", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("ship-lift-cradle");
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

p.part("side-rail-0", b("side-rail-0", [3000, 220, 260], [0, -740, 190]).color(yardPaint));
p.part("side-rail-1", b("side-rail-1", [3000, 220, 260], [0, 740, 190]).color(structuralSteel));
p.part("cross-tie-0", b("cross-tie-0", [180, 1430, 130], [-1100, 0, 105]).color(structuralSteel));
p.part("cross-tie-1", b("cross-tie-1", [180, 1430, 130], [0, 0, 105]).color(structuralSteel));
p.part("cross-tie-2", b("cross-tie-2", [180, 1430, 130], [1100, 0, 105]).color(structuralSteel));
p.part("hull-pad-0", b("hull-pad-0", [300, 320, 520], [-1050, -480, 520]).color(elastomer));
p.part("hull-pad-1", b("hull-pad-1", [300, 320, 520], [-1050, 480, 520]).color(elastomer));
p.part("hull-pad-2", b("hull-pad-2", [300, 320, 520], [1050, -480, 520]).color(elastomer));
p.part("hull-pad-3", b("hull-pad-3", [300, 320, 520], [1050, 480, 520]).color(elastomer));
p.part("guide-roller-0", c("guide-roller-0", 220, 90, 10, [-1280, -760, 90], [90, 0, 0], 90).color(structuralSteel));
p.part("guide-roller-1", c("guide-roller-1", 220, 90, 10, [1280, -760, 90], [90, 0, 0], 90).color(structuralSteel));
p.part("guide-roller-2", c("guide-roller-2", 220, 90, 10, [-1280, 760, 90], [90, 0, 0], 90).color(structuralSteel));
p.part("guide-roller-3", c("guide-roller-3", 220, 90, 10, [1280, 760, 90], [90, 0, 0], 90).color(structuralSteel));

return p.model();
