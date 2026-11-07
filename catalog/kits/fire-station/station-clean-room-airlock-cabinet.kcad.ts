// Clean-room airlock cabinet: Pass-through cabinet with separate dirty-side and clean-side doors. Millimetres, Z up, base origin.
meta({
  name: "station-clean-room-airlock-cabinet",
  license: 'CC0-1.0',
  title: "Clean-room airlock cabinet",
  description: "Pass-through cabinet with separate dirty-side and clean-side doors. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean-room", "airlock", "cabinet"],
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
const polymer = param("polymer", "#e8e4d9", { label: "Polymer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "signalColor": "#f3c83d", "polymer": "#e8e4d9"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "signalColor": "#f2c642", "polymer": "#ece9e1"},
});
const p = assembly("station-clean-room-airlock-cabinet");

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

p.part("cabinet", b([1080, 680, 1100], [0, 0, 550]).color(powderCoat));
p.part("dirty-door", b([500, 28, 960], [-270, -355, 550]).color(powderCoat));
p.part("clean-door", b([500, 28, 960], [270, 355, 550]).color(powderCoat));
p.part("shelf", b([970, 480, 60], [0, 0, 550]).color(stainlessSteel));
p.part("door-handle-dirty", b([32, 44, 250], [-80, -390, 550]).color(polymer));
p.part("door-handle-clean", b([32, 44, 250], [460, 390, 550]).color(polymer));
p.part("status-strip", b([900, 18, 90], [0, -360, 1070]).color(signalColor));

return p.model();
