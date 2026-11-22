// Modular axle carrier: Short modular transporter unit with a central load deck, paired axle beams, eight wheels, and side control boxes. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "modular-axle-carrier",
  license: 'CC0-1.0',
  title: "Modular axle carrier",
  description: "Short modular transporter unit with a central load deck, paired axle beams, eight wheels, and side control boxes. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "modular", "axle", "carrier"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#71837d", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#8b9994", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#5e6d68", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("modular-axle-carrier");
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

p.part("load-deck", b("load-deck", [2100, 1250, 220], [0, 0, 430]).color(yardPaint));
p.part("axle-beam-0", b("axle-beam-0", [280, 1550, 240], [-700, 0, 170]).color(structuralSteel));
p.part("axle-beam-1", b("axle-beam-1", [280, 1550, 240], [700, 0, 170]).color(structuralSteel));
p.part("wheel-0", c("wheel-0", 180, 170, 10, [-700, -620, 170], [90, 0, 0], 90).color(elastomer));
p.part("wheel-1", c("wheel-1", 180, 170, 10, [-700, -210, 170], [90, 0, 0], 90).color(elastomer));
p.part("wheel-2", c("wheel-2", 180, 170, 10, [-700, 210, 170], [90, 0, 0], 90).color(elastomer));
p.part("wheel-3", c("wheel-3", 180, 170, 10, [-700, 620, 170], [90, 0, 0], 90).color(elastomer));
p.part("wheel-4", c("wheel-4", 180, 170, 10, [700, -620, 170], [90, 0, 0], 90).color(elastomer));
p.part("wheel-5", c("wheel-5", 180, 170, 10, [700, -210, 170], [90, 0, 0], 90).color(elastomer));
p.part("wheel-6", c("wheel-6", 180, 170, 10, [700, 210, 170], [90, 0, 0], 90).color(elastomer));
p.part("wheel-7", c("wheel-7", 180, 170, 10, [700, 620, 170], [90, 0, 0], 90).color(elastomer));
p.part("control-box-0", b("control-box-0", [270, 360, 340], [-720, -790, 710]).color(yardPaint));
p.part("control-box-1", b("control-box-1", [270, 360, 340], [720, -790, 710]).color(yardPaint));
p.part("coupling-pin", b("coupling-pin", [180, 180, 360], [0, 780, 650]).color(structuralSteel));

return p.model();
