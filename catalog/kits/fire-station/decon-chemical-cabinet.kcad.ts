// Decontamination supply cabinet: Labeled cabinet for segregated cleaning supplies with drip shelf and lockable doors. Millimetres, Z up, base origin.
meta({
  name: "decon-chemical-cabinet",
  license: 'CC0-1.0',
  title: "Decontamination supply cabinet",
  description: "Labeled cabinet for segregated cleaning supplies with drip shelf and lockable doors. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "supply", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
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
const p = assembly("decon-chemical-cabinet");

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

p.part("cabinet", b([900, 520, 1800], [0, 0, 900]).color(powderCoat));
p.part("left-door", b([430, 26, 1680], [-220, -275, 900]).color(powderCoat));
p.part("right-door", b([430, 26, 1680], [220, -275, 900]).color(powderCoat));
p.part("drip-shelf", b([940, 560, 50], [0, 0, 70]).color(stainlessSteel));
p.part("shelf-0", b([820, 470, 38], [0, 0, 420]).color(stainlessSteel));
p.part("shelf-1", b([820, 470, 38], [0, 0, 810]).color(stainlessSteel));
p.part("shelf-2", b([820, 470, 38], [0, 0, 1200]).color(stainlessSteel));
p.part("lock", b([45, 28, 95], [0, -300, 870]).color(stainlessSteel));

return p.model();
