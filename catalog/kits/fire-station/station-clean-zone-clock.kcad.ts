// Station clean-zone clock: Large wall clock with a deep bezel and high-contrast index marks. Millimetres, Z up, wall origin.
meta({
  name: "station-clean-zone-clock",
  license: 'CC0-1.0',
  title: "Station clean-zone clock",
  description: "Large wall clock with a deep bezel and high-contrast index marks. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean-zone", "clock"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4b8984", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db"},
});
const p = assembly("station-clean-zone-clock");

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

p.part("backplate", b([620, 75, 620], [0, 0, 1750]).color(stainlessSteel));
p.part("bezel", c(80, 285, 12, [0, -45, 1750], [1, 0, 0], 90).color(powderCoat));
p.part("face", c(18, 244, 12, [0, -95, 1750], [1, 0, 0], 90).color(powderCoat));
p.part("hour-mark-0", b([16, 18, 52], [0, -112, 1960]).color(powderCoat));
p.part("hour-mark-1", b([16, 18, 52], [145, -112, 1905]).color(powderCoat));
p.part("hour-mark-2", b([16, 18, 52], [205, -112, 1750]).color(powderCoat));
p.part("hour-mark-3", b([16, 18, 52], [145, -112, 1595]).color(powderCoat));
p.part("hour-mark-4", b([16, 18, 52], [0, -112, 1540]).color(powderCoat));
p.part("hour-mark-5", b([16, 18, 52], [-145, -112, 1595]).color(powderCoat));
p.part("hour-mark-6", b([16, 18, 52], [-205, -112, 1750]).color(powderCoat));
p.part("hour-mark-7", b([16, 18, 52], [-145, -112, 1905]).color(powderCoat));
p.part("minute-hand", b([14, 150, 18], [0, -125, 1785], [0, 0, 30]).color(powderCoat));

return p.model();
