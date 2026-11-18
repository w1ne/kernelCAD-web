// Station key control cabinet: Lockable key cabinet with numbered hooks, access keypad and issue-return slots. Millimetres, Z up, base origin.
meta({
  name: "station-key-control-cabinet",
  license: 'CC0-1.0',
  title: "Station key control cabinet",
  description: "Lockable key cabinet with numbered hooks, access keypad and issue-return slots. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "key", "control", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4c7089", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const elastomer = param("elastomer", "#303539", { label: "Elastomer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b"},
});
const p = assembly("station-key-control-cabinet");

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

p.part("cabinet", b([760, 300, 980], [0, 0, 490]).color(powderCoat));
p.part("door", b([700, 28, 900], [0, -165, 490]).color(powderCoat));
p.part("key-hook-0", c(55, 14, 8, [-260, -190, 600]).color(stainlessSteel));
p.part("key-hook-1", c(55, 14, 8, [-130, -190, 600]).color(stainlessSteel));
p.part("key-hook-2", c(55, 14, 8, [0, -190, 600]).color(stainlessSteel));
p.part("key-hook-3", c(55, 14, 8, [130, -190, 600]).color(stainlessSteel));
p.part("key-hook-4", c(55, 14, 8, [260, -190, 600]).color(stainlessSteel));
p.part("key-hook-5", c(55, 14, 8, [-260, -190, 770]).color(stainlessSteel));
p.part("key-hook-6", c(55, 14, 8, [-130, -190, 770]).color(stainlessSteel));
p.part("key-hook-7", c(55, 14, 8, [0, -190, 770]).color(stainlessSteel));
p.part("key-hook-8", c(55, 14, 8, [130, -190, 770]).color(stainlessSteel));
p.part("key-hook-9", c(55, 14, 8, [260, -190, 770]).color(stainlessSteel));
p.part("keypad", b([145, 25, 210], [460, -190, 640]).color(elastomer));
p.part("return-slot", b([250, 35, 65], [-50, -195, 185]).color(stainlessSteel));

return p.model();
