// Gear inspection bench: Durable inspection table with bright task-light mast, tool strip and shallow parts tray. Millimetres, Z up, base origin.
meta({
  name: "gear-inspection-bench",
  license: 'CC0-1.0',
  title: "Gear inspection bench",
  description: "Durable inspection table with bright task-light mast, tool strip and shallow parts tray. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "gear", "inspection", "bench"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const signalColor = param("signalColor", "#f0bf38", { label: "Safety color" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "signalColor": "#f3c83d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "signalColor": "#f2c642"},
});
const p = assembly("gear-inspection-bench");

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

p.part("top", b([1500, 760, 65], [0, 0, 860]).color(powderCoat));
p.part("leg-0", b([70, 70, 825], [-660, -300, 412.5]).color(stainlessSteel));
p.part("leg-1", b([70, 70, 825], [660, -300, 412.5]).color(stainlessSteel));
p.part("leg-2", b([70, 70, 825], [-660, 300, 412.5]).color(stainlessSteel));
p.part("leg-3", b([70, 70, 825], [660, 300, 412.5]).color(stainlessSteel));
p.part("rear-tool-strip", b([1380, 38, 110], [0, 340, 945]).color(powderCoat));
p.part("parts-tray", b([500, 230, 70], [380, 130, 930]).color(stainlessSteel));
p.part("task-light-mast", c(680, 22, 8, [-620, 235, 0]).color(signalColor));
p.part("task-light-head", b([230, 165, 55], [-620, 210, 700]).color(signalColor));

return p.model();
