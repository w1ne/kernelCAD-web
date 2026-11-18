// Decontamination tool rack: Wall rack with removable brush slots and a drip channel for cleaning tools. Millimetres, Z up, wall origin.
meta({
  name: "station-decon-tool-rack",
  license: 'CC0-1.0',
  title: "Decontamination tool rack",
  description: "Wall rack with removable brush slots and a drip channel for cleaning tools. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "tool", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4b8984", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const signalColor = param("signalColor", "#f0bf38", { label: "Safety color" });
const polymer = param("polymer", "#e8e4d9", { label: "Polymer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "signalColor": "#f3c83d", "polymer": "#e8e4d9"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "signalColor": "#f2c642", "polymer": "#ece9e1"},
});
const p = assembly("station-decon-tool-rack");

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

p.part("backplate", b([1200, 54, 1000], [0, 0, 1350]).color(stainlessSteel));
p.part("drip-channel", b([1260, 180, 48], [0, -70, 840]).color(powderCoat));
p.part("tool-loop-0", b([90, 46, 90], [-450, -60, 1100]).color(powderCoat));
p.part("tool-loop-1", b([90, 46, 90], [-150, -60, 1100]).color(powderCoat));
p.part("tool-loop-2", b([90, 46, 90], [150, -60, 1100]).color(powderCoat));
p.part("tool-loop-3", b([90, 46, 90], [450, -60, 1100]).color(powderCoat));
p.part("handle-clip-0", b([52, 30, 270], [-450, -80, 1500]).color(polymer));
p.part("handle-clip-1", b([52, 30, 270], [-150, -80, 1500]).color(polymer));
p.part("handle-clip-2", b([52, 30, 270], [150, -80, 1500]).color(polymer));
p.part("handle-clip-3", b([52, 30, 270], [450, -80, 1500]).color(polymer));
p.part("label-strip", b([1050, 20, 88], [0, -38, 1900]).color(signalColor));

return p.model();
