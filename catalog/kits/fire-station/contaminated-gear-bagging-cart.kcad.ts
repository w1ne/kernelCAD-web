// Contaminated gear bagging cart: Closed transport cart with segregated bag bins and a lid for recently used equipment. Millimetres, Z up, base origin.
meta({
  name: "contaminated-gear-bagging-cart",
  license: 'CC0-1.0',
  title: "Contaminated gear bagging cart",
  description: "Closed transport cart with segregated bag bins and a lid for recently used equipment. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "contaminated", "gear", "bagging", "cart"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const elastomer = param("elastomer", "#303539", { label: "Elastomer" });
const polymer = param("polymer", "#e8e4d9", { label: "Polymer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "elastomer": "#252a2d", "polymer": "#e8e4d9"},
  'clean-zone': {"powderCoat": "#4e8c87", "elastomer": "#30383b", "polymer": "#ece9e1"},
});
const p = assembly("contaminated-gear-bagging-cart");

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

p.part("cart-body", b([820, 620, 740], [0, 0, 420]).color(powderCoat));
p.part("lid", b([860, 660, 70], [0, 0, 825]).color(powderCoat));
p.part("bin-front-0", b([360, 35, 300], [-205, -332, 270]).color(powderCoat));
p.part("bin-front-1", b([360, 35, 300], [205, -332, 270]).color(powderCoat));
p.part("caster-0", c(42, 44, 8, [-310, -220, 0]).color(elastomer));
p.part("caster-1", c(42, 44, 8, [310, -220, 0]).color(elastomer));
p.part("caster-2", c(42, 44, 8, [-310, 220, 0]).color(elastomer));
p.part("caster-3", c(42, 44, 8, [310, 220, 0]).color(elastomer));
p.part("push-handle", b([720, 45, 42], [0, 325, 800]).color(polymer));

return p.model();
