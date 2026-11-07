// Fire watch response cart: Hot-work watch cart with a tool chest, hose reel, extinguisher cradle, and a tall signal mast. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "fire-watch-response-cart",
  license: 'CC0-1.0',
  title: "Fire watch response cart",
  description: "Hot-work watch cart with a tool chest, hose reel, extinguisher cradle, and a tall signal mast. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "fire", "watch", "response", "cart"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#b45a42", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });
const safetyMarking = param("safetyMarking", "#efb934", { label: "Safety marking" });

presets({
  'fresh-coat': {"yardPaint": "#c27864", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245", "safetyMarking": "#ffd44d"},
  'weathered-yard': {"yardPaint": "#954b37", "structuralSteel": "#828d91", "elastomer": "#252b2d", "safetyMarking": "#bd8528"},
});

const p = assembly("fire-watch-response-cart");
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

p.part("cart-frame", b("cart-frame", [1280, 700, 150], [0, 0, 430]).color(structuralSteel));
p.part("tool-chest", b("tool-chest", [760, 560, 660], [-170, 0, 835]).color(yardPaint));
p.part("hose-reel", c("hose-reel", 180, 300, 14, [480, 0, 850], [90, 0, 0], 90).color(elastomer));
p.part("extinguisher-cradle", b("extinguisher-cradle", [300, 350, 520], [420, 300, 690]).color(yardPaint));
p.part("signal-mast", c("signal-mast", 1030, 45, 8, [550, 280, 1480]).color(safetyMarking));
p.part("cart-wheel-0", c("cart-wheel-0", 80, 165, 10, [-520, -300, 165], [90, 0, 0], 90).color(elastomer));
p.part("cart-wheel-1", c("cart-wheel-1", 80, 165, 10, [520, -300, 165], [90, 0, 0], 90).color(elastomer));
p.part("cart-wheel-2", c("cart-wheel-2", 80, 165, 10, [-520, 300, 165], [90, 0, 0], 90).color(elastomer));
p.part("cart-wheel-3", c("cart-wheel-3", 80, 165, 10, [520, 300, 165], [90, 0, 0], 90).color(elastomer));
p.part("push-handle", b("push-handle", [90, 650, 90], [-650, 0, 940]).color(structuralSteel));

return p.model();
