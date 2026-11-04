// Hull block spreader beam: Generic lifting spreader with a central beam, four adjustable drop links, and soft-contact end shoes. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "hull-block-spreader-beam",
  license: 'CC0-1.0',
  title: "Hull block spreader beam",
  description: "Generic lifting spreader with a central beam, four adjustable drop links, and soft-contact end shoes. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "hull", "block", "spreader", "beam"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#78827a", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#909892", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#646c65", "structuralSteel": "#828d91"},
});

const p = assembly("hull-block-spreader-beam");
const originOffsetMm = -360;

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

p.part("main-beam", b("main-beam", [3100, 260, 300], [0, 0, 1500]).color(yardPaint));
p.part("lifting-lug-0", b("lifting-lug-0", [260, 240, 420], [-1150, 0, 1860]).color(yardPaint));
p.part("lifting-lug-1", b("lifting-lug-1", [260, 240, 420], [1150, 0, 1860]).color(yardPaint));
p.part("drop-link-0", b("drop-link-0", [110, 110, 980], [-1320, -580, 1000]).color(yardPaint));
p.part("drop-link-1", b("drop-link-1", [110, 110, 980], [-1320, 580, 1000]).color(yardPaint));
p.part("drop-link-2", b("drop-link-2", [110, 110, 980], [1320, -580, 1000]).color(yardPaint));
p.part("drop-link-3", b("drop-link-3", [110, 110, 980], [1320, 580, 1000]).color(yardPaint));
p.part("contact-shoe-0", b("contact-shoe-0", [500, 420, 160], [-1320, -580, 440]).color(yardPaint));
p.part("contact-shoe-1", b("contact-shoe-1", [500, 420, 160], [-1320, 580, 440]).color(yardPaint));
p.part("contact-shoe-2", b("contact-shoe-2", [500, 420, 160], [1320, -580, 440]).color(yardPaint));
p.part("contact-shoe-3", b("contact-shoe-3", [500, 420, 160], [1320, 580, 440]).color(yardPaint));
p.part("shackle-pin-0", c("shackle-pin-0", 320, 80, 10, [-1150, 0, 1990], [90, 0, 0], 90).color(structuralSteel));
p.part("shackle-pin-1", c("shackle-pin-1", 320, 80, 10, [1150, 0, 1990], [90, 0, 0], 90).color(structuralSteel));

return p.model();
