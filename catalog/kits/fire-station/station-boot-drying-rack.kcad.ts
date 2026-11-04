// Station boot drying rack: Wall rail with six inverted boot nozzles and a removable drip channel. Millimetres, Z up, wall origin.
meta({
  name: "station-boot-drying-rack",
  license: 'CC0-1.0',
  title: "Station boot drying rack",
  description: "Wall rail with six inverted boot nozzles and a removable drip channel. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "boot", "drying", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const elastomer = param("elastomer", "#303539", { label: "Elastomer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b"},
});
const p = assembly("station-boot-drying-rack");

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

p.part("mount-rail", b([1600, 70, 180], [0, 0, 1350]).color(stainlessSteel));
p.part("drip-channel", b([1600, 160, 80], [0, -80, 860]).color(powderCoat));
p.part("boot-nozzle-0", c(450, 28, 8, [-600, -130, 1090]).color(elastomer));
p.part("boot-nozzle-1", c(450, 28, 8, [-360, -130, 1090]).color(elastomer));
p.part("boot-nozzle-2", c(450, 28, 8, [-120, -130, 1090]).color(elastomer));
p.part("boot-nozzle-3", c(450, 28, 8, [120, -130, 1090]).color(elastomer));
p.part("boot-nozzle-4", c(450, 28, 8, [360, -130, 1090]).color(elastomer));
p.part("boot-nozzle-5", c(450, 28, 8, [600, -130, 1090]).color(elastomer));
p.part("mount-bracket-0", b([65, 100, 340], [-700, 0, 1200]).color(stainlessSteel));
p.part("mount-bracket-1", b([65, 100, 340], [700, 0, 1200]).color(stainlessSteel));

return p.model();
