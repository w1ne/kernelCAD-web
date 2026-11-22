// Decontamination boot brush set: Pair of upright boot brushes fixed to a drainable floor plate. Millimetres, Z up, base origin.
meta({
  name: "decon-boot-brush-set",
  license: 'CC0-1.0',
  title: "Decontamination boot brush set",
  description: "Pair of upright boot brushes fixed to a drainable floor plate. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "boot", "brush", "set"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4b8984", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const elastomer = param("elastomer", "#303539", { label: "Elastomer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b"},
});
const p = assembly("decon-boot-brush-set");

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

p.part("footplate", b([580, 390, 62], [0, 0, 31]).color(elastomer));
p.part("brush-0", b([180, 75, 420], [-150, 0, 272]).color(elastomer));
p.part("brush-1", b([180, 75, 420], [150, 0, 272]).color(elastomer));
p.part("bristle-0", b([20, 54, 340], [-225, -10, 300]).color(powderCoat));
p.part("bristle-1", b([20, 54, 340], [-195, -10, 300]).color(powderCoat));
p.part("bristle-2", b([20, 54, 340], [-165, -10, 300]).color(powderCoat));
p.part("bristle-3", b([20, 54, 340], [-135, -10, 300]).color(powderCoat));
p.part("bristle-4", b([20, 54, 340], [-105, -10, 300]).color(powderCoat));
p.part("bristle-5", b([20, 54, 340], [-75, -10, 300]).color(powderCoat));
p.part("bristle-6", b([20, 54, 340], [-45, -10, 300]).color(powderCoat));
p.part("bristle-7", b([20, 54, 340], [-15, -10, 300]).color(powderCoat));
p.part("bristle-8", b([20, 54, 340], [15, -10, 300]).color(powderCoat));
p.part("bristle-9", b([20, 54, 340], [45, -10, 300]).color(powderCoat));
p.part("bristle-10", b([20, 54, 340], [75, -10, 300]).color(powderCoat));
p.part("bristle-11", b([20, 54, 340], [105, -10, 300]).color(powderCoat));
p.part("bristle-12", b([20, 54, 340], [135, -10, 300]).color(powderCoat));
p.part("bristle-13", b([20, 54, 340], [165, -10, 300]).color(powderCoat));
p.part("bristle-14", b([20, 54, 340], [195, -10, 300]).color(powderCoat));
p.part("bristle-15", b([20, 54, 340], [225, -10, 300]).color(powderCoat));
p.part("grab-rail", b([55, 45, 520], [0, 155, 325]).color(stainlessSteel));

return p.model();
