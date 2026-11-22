// Clean gear cabinet: Ventilated clean-storage cabinet with divided shelves and a sealed door. Millimetres, Z up, base origin.
meta({
  name: "clean-gear-cabinet",
  license: 'CC0-1.0',
  title: "Clean gear cabinet",
  description: "Ventilated clean-storage cabinet with divided shelves and a sealed door. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean", "gear", "cabinet"],
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
const p = assembly("clean-gear-cabinet");

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

p.part("base", b([980, 650, 100], [0, 0, 50]).color(powderCoat));
p.part("cabinet", b([900, 580, 1800], [0, 0, 1000]).color(powderCoat));
p.part("door", b([840, 30, 1690], [0, -305, 1000]).color(powderCoat));
p.part("shelf-0", b([820, 520, 40], [0, 0, 320]).color(stainlessSteel));
p.part("shelf-1", b([820, 520, 40], [0, 0, 710]).color(stainlessSteel));
p.part("shelf-2", b([820, 520, 40], [0, 0, 1100]).color(stainlessSteel));
p.part("shelf-3", b([820, 520, 40], [0, 0, 1490]).color(stainlessSteel));
p.part("vent-0", b([640, 20, 22], [0, -326, 120]).color(stainlessSteel));
p.part("vent-1", b([640, 20, 22], [0, -326, 175]).color(stainlessSteel));
p.part("vent-2", b([640, 20, 22], [0, -326, 230]).color(stainlessSteel));
p.part("vent-3", b([640, 20, 22], [0, -326, 285]).color(stainlessSteel));
p.part("vent-4", b([640, 20, 22], [0, -326, 340]).color(stainlessSteel));

return p.model();
