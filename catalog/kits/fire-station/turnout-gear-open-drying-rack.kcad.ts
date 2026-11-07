// Turnout gear open drying rack: Freestanding frame with four gear bays, boot shelves and hanging rails. Millimetres, Z up, base origin.
meta({
  name: "turnout-gear-open-drying-rack",
  license: 'CC0-1.0',
  title: "Turnout gear open drying rack",
  description: "Freestanding frame with four gear bays, boot shelves and hanging rails. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "turnout", "gear", "open", "drying", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#b94338", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const elastomer = param("elastomer", "#303539", { label: "Elastomer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b"},
});
const p = assembly("turnout-gear-open-drying-rack");

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


const b = (size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = profiledBox(size[0], size[1], size[2]);
  if (rotation?.[0]) shape = shape.rotateX(rotation[0]);
  if (rotation?.[1]) shape = shape.rotateY(rotation[1]);
  if (rotation?.[2]) shape = shape.rotateZ(rotation[2]);
  return shape.translate(at[0], at[1], at[2]).scale(scale);
};
const ngon = (r: number, sides: number, rotation = 0) => {
  let profile = path().moveTo(r * Math.cos(rotation), r * Math.sin(rotation));
  for (let i = 1; i < sides; i++) {
    const angle = rotation + 2 * Math.PI * i / sides;
    profile = profile.lineTo(r * Math.cos(angle), r * Math.sin(angle));
  }
  return profile.close();
};
const profiledCylinder = (h: number, r: number, sides: number) =>
  ngon(r, sides).loft(ngon(r * 0.95, sides, Math.PI / sides), { spacing: h, ruled: true });
const c = (h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = profiledCylinder(h, r, segments);
  if (axis && degrees) {
    if (axis[0]) shape = shape.rotateX(degrees);
    else if (axis[1]) shape = shape.rotateY(degrees);
    else if (axis[2]) shape = shape.rotateZ(degrees);
  }
  return shape.translate(at[0], at[1], at[2]).scale(scale);
};

p.part("upright-0", b([48, 52, 1980], [-670, -260, 990]).color(powderCoat));
p.part("upright-1", b([48, 52, 1980], [-225, -260, 990]).color(powderCoat));
p.part("upright-2", b([48, 52, 1980], [225, -260, 990]).color(powderCoat));
p.part("upright-3", b([48, 52, 1980], [670, -260, 990]).color(powderCoat));
p.part("upright-4", b([48, 52, 1980], [-670, 260, 990]).color(powderCoat));
p.part("upright-5", b([48, 52, 1980], [-225, 260, 990]).color(powderCoat));
p.part("upright-6", b([48, 52, 1980], [225, 260, 990]).color(powderCoat));
p.part("upright-7", b([48, 52, 1980], [670, 260, 990]).color(powderCoat));
p.part("top-rail-front", b([1440, 48, 52], [0, -260, 1950]).color(stainlessSteel));
p.part("top-rail-back", b([1440, 48, 52], [0, 260, 1950]).color(stainlessSteel));
p.part("boot-shelf", b([1440, 560, 52], [0, 0, 90]).color(elastomer));
p.part("hook-0", c(110, 20, 8, [-500, 0, 1840]).color(stainlessSteel));
p.part("hook-1", c(110, 20, 8, [-170, 0, 1840]).color(stainlessSteel));
p.part("hook-2", c(110, 20, 8, [170, 0, 1840]).color(stainlessSteel));
p.part("hook-3", c(110, 20, 8, [500, 0, 1840]).color(stainlessSteel));

return p.model();
