// Apparatus bay trench drain: Long grated drain channel with end outlet and removable grate panels. Millimetres, Z up, base origin.
meta({
  name: "bay-trench-drain",
  license: 'CC0-1.0',
  title: "Apparatus bay trench drain",
  description: "Long grated drain channel with end outlet and removable grate panels. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "apparatus", "bay", "trench", "drain"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db"},
});
const p = assembly("bay-trench-drain");

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

p.part("channel-body", b([3600, 210, 150], [0, 0, 75]).color(powderCoat));
p.part("grate-panel-0", b([440, 204, 24], [-1500, 0, 162]).color(stainlessSteel));
p.part("grate-panel-1", b([440, 204, 24], [-1000, 0, 162]).color(stainlessSteel));
p.part("grate-panel-2", b([440, 204, 24], [-500, 0, 162]).color(stainlessSteel));
p.part("grate-panel-3", b([440, 204, 24], [0, 0, 162]).color(stainlessSteel));
p.part("grate-panel-4", b([440, 204, 24], [500, 0, 162]).color(stainlessSteel));
p.part("grate-panel-5", b([440, 204, 24], [1000, 0, 162]).color(stainlessSteel));
p.part("grate-panel-6", b([440, 204, 24], [1500, 0, 162]).color(stainlessSteel));
p.part("grate-slot-0", b([18, 185, 10], [-1650, 0, 180]).color(stainlessSteel));
p.part("grate-slot-1", b([18, 185, 10], [-1555, 0, 180]).color(stainlessSteel));
p.part("grate-slot-2", b([18, 185, 10], [-1460, 0, 180]).color(stainlessSteel));
p.part("grate-slot-3", b([18, 185, 10], [-1365, 0, 180]).color(stainlessSteel));
p.part("grate-slot-4", b([18, 185, 10], [-1270, 0, 180]).color(stainlessSteel));
p.part("grate-slot-5", b([18, 185, 10], [-1175, 0, 180]).color(stainlessSteel));
p.part("grate-slot-6", b([18, 185, 10], [-1080, 0, 180]).color(stainlessSteel));
p.part("grate-slot-7", b([18, 185, 10], [-985, 0, 180]).color(stainlessSteel));
p.part("grate-slot-8", b([18, 185, 10], [-890, 0, 180]).color(stainlessSteel));
p.part("grate-slot-9", b([18, 185, 10], [-795, 0, 180]).color(stainlessSteel));
p.part("grate-slot-10", b([18, 185, 10], [-700, 0, 180]).color(stainlessSteel));
p.part("grate-slot-11", b([18, 185, 10], [-605, 0, 180]).color(stainlessSteel));
p.part("grate-slot-12", b([18, 185, 10], [-510, 0, 180]).color(stainlessSteel));
p.part("grate-slot-13", b([18, 185, 10], [-415, 0, 180]).color(stainlessSteel));
p.part("grate-slot-14", b([18, 185, 10], [-320, 0, 180]).color(stainlessSteel));
p.part("grate-slot-15", b([18, 185, 10], [-225, 0, 180]).color(stainlessSteel));
p.part("grate-slot-16", b([18, 185, 10], [-130, 0, 180]).color(stainlessSteel));
p.part("grate-slot-17", b([18, 185, 10], [-35, 0, 180]).color(stainlessSteel));
p.part("grate-slot-18", b([18, 185, 10], [60, 0, 180]).color(stainlessSteel));
p.part("grate-slot-19", b([18, 185, 10], [155, 0, 180]).color(stainlessSteel));
p.part("grate-slot-20", b([18, 185, 10], [250, 0, 180]).color(stainlessSteel));
p.part("grate-slot-21", b([18, 185, 10], [345, 0, 180]).color(stainlessSteel));
p.part("grate-slot-22", b([18, 185, 10], [440, 0, 180]).color(stainlessSteel));
p.part("grate-slot-23", b([18, 185, 10], [535, 0, 180]).color(stainlessSteel));
p.part("grate-slot-24", b([18, 185, 10], [630, 0, 180]).color(stainlessSteel));
p.part("grate-slot-25", b([18, 185, 10], [725, 0, 180]).color(stainlessSteel));
p.part("grate-slot-26", b([18, 185, 10], [820, 0, 180]).color(stainlessSteel));
p.part("grate-slot-27", b([18, 185, 10], [915, 0, 180]).color(stainlessSteel));
p.part("grate-slot-28", b([18, 185, 10], [1010, 0, 180]).color(stainlessSteel));
p.part("grate-slot-29", b([18, 185, 10], [1105, 0, 180]).color(stainlessSteel));
p.part("grate-slot-30", b([18, 185, 10], [1200, 0, 180]).color(stainlessSteel));
p.part("grate-slot-31", b([18, 185, 10], [1295, 0, 180]).color(stainlessSteel));
p.part("grate-slot-32", b([18, 185, 10], [1390, 0, 180]).color(stainlessSteel));
p.part("grate-slot-33", b([18, 185, 10], [1485, 0, 180]).color(stainlessSteel));
p.part("grate-slot-34", b([18, 185, 10], [1580, 0, 180]).color(stainlessSteel));
p.part("outlet", c(200, 58, 12, [0, 0, 0]).color(stainlessSteel));

return p.model();
