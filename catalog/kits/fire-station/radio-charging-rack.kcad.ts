// Radio charging rack: Wall rack with six handheld-radio charging bays and cable management. Millimetres, Z up, wall origin.
meta({
  name: "radio-charging-rack",
  license: 'CC0-1.0',
  title: "Radio charging rack",
  description: "Wall rack with six handheld-radio charging bays and cable management. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "radio", "charging", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4c7089", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db"},
});
const p = assembly("radio-charging-rack");

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

p.part("backplate", b([1100, 60, 750], [0, 0, 1500]).color(stainlessSteel));
p.part("upper-rail", b([1160, 90, 70], [0, -20, 1880]).color(stainlessSteel));
p.part("charger-0", b([130, 160, 310], [-440, -105, 1425]).color(powderCoat));
p.part("charger-1", b([130, 160, 310], [-264, -105, 1425]).color(powderCoat));
p.part("charger-2", b([130, 160, 310], [-88, -105, 1425]).color(powderCoat));
p.part("charger-3", b([130, 160, 310], [88, -105, 1425]).color(powderCoat));
p.part("charger-4", b([130, 160, 310], [264, -105, 1425]).color(powderCoat));
p.part("charger-5", b([130, 160, 310], [440, -105, 1425]).color(powderCoat));
p.part("radio-antenna-0", c(160, 10, 8, [-440, -145, 1610]).color(powderCoat));
p.part("radio-antenna-1", c(160, 10, 8, [-264, -145, 1610]).color(powderCoat));
p.part("radio-antenna-2", c(160, 10, 8, [-88, -145, 1610]).color(powderCoat));
p.part("radio-antenna-3", c(160, 10, 8, [88, -145, 1610]).color(powderCoat));
p.part("radio-antenna-4", c(160, 10, 8, [264, -145, 1610]).color(powderCoat));
p.part("radio-antenna-5", c(160, 10, 8, [440, -145, 1610]).color(powderCoat));
p.part("cable-tray", b([1080, 85, 60], [0, 0, 1065]).color(stainlessSteel));

return p.model();
