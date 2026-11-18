// SCBA cylinder fill bank: Cylinder refill cabinet with guarded fill sockets and hinged blast-shield lid. Millimetres, Z up, base origin.
meta({
  name: "scba-cylinder-fill-bank",
  license: 'CC0-1.0',
  title: "SCBA cylinder fill bank",
  description: "Cylinder refill cabinet with guarded fill sockets and hinged blast-shield lid. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "scba", "cylinder", "fill", "bank"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#b94338", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const signalColor = param("signalColor", "#f0bf38", { label: "Safety color" });
const polymer = param("polymer", "#e8e4d9", { label: "Polymer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "signalColor": "#f3c83d", "polymer": "#e8e4d9"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "signalColor": "#f2c642", "polymer": "#ece9e1"},
});
const p = assembly("scba-cylinder-fill-bank");

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

p.part("base", b([980, 760, 180], [0, 0, 90]).color(powderCoat));
p.part("cabinet", b([900, 680, 780], [0, 0, 570]).color(powderCoat));
p.part("shield", b([900, 80, 440], [0, 385, 690]).color(polymer));
p.part("top-cover", b([980, 760, 70], [0, 0, 995]).color(polymer));
p.part("fill-port-0", c(74, 32, 8, [-300, -365, 610], [1, 0, 0], 90).color(stainlessSteel));
p.part("fill-port-1", c(74, 32, 8, [-100, -365, 610], [1, 0, 0], 90).color(stainlessSteel));
p.part("fill-port-2", c(74, 32, 8, [100, -365, 610], [1, 0, 0], 90).color(stainlessSteel));
p.part("fill-port-3", c(74, 32, 8, [300, -365, 610], [1, 0, 0], 90).color(stainlessSteel));
p.part("pressure-display", b([290, 34, 165], [0, -367, 820]).color(signalColor));

return p.model();
