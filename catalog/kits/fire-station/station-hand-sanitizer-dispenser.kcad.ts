// Station sanitizer dispenser: Wall dispenser with a protected reservoir, push lever and drip-catch plate. Millimetres, Z up, wall origin.
meta({
  name: "station-hand-sanitizer-dispenser",
  license: 'CC0-1.0',
  title: "Station sanitizer dispenser",
  description: "Wall dispenser with a protected reservoir, push lever and drip-catch plate. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "sanitizer", "dispenser"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const polymer = param("polymer", "#e8e4d9", { label: "Polymer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "polymer": "#e8e4d9"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "polymer": "#ece9e1"},
});
const p = assembly("station-hand-sanitizer-dispenser");

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

p.part("backplate", b([210, 54, 420], [0, 0, 1480]).color(stainlessSteel));
p.part("reservoir", b([165, 150, 275], [0, -58, 1520]).color(polymer));
p.part("push-lever", b([155, 65, 38], [0, -125, 1370]).color(powderCoat));
p.part("catch-tray", b([230, 150, 35], [0, -70, 1240]).color(stainlessSteel));
p.part("level-window", b([38, 20, 150], [40, -138, 1530]).color(polymer));

return p.model();
