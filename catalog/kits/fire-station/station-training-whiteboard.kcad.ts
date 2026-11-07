// Station training whiteboard: Wall training board with marker ledge, grid lines and three magnetic panels. Millimetres, Z up, wall origin.
meta({
  name: "station-training-whiteboard",
  license: 'CC0-1.0',
  title: "Station training whiteboard",
  description: "Wall training board with marker ledge, grid lines and three magnetic panels. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "training", "whiteboard"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const signalColor = param("signalColor", "#f0bf38", { label: "Safety color" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "signalColor": "#f3c83d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "signalColor": "#f2c642"},
});
const p = assembly("station-training-whiteboard");

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

p.part("board", b([1800, 55, 1100], [0, 0, 1600]).color(powderCoat));
p.part("left-panel", b([560, 18, 980], [-610, -42, 1600]).color(powderCoat));
p.part("center-panel", b([560, 18, 980], [0, -42, 1600]).color(powderCoat));
p.part("right-panel", b([560, 18, 980], [610, -42, 1600]).color(powderCoat));
p.part("marker-tray", b([1720, 135, 50], [0, -92, 1035]).color(signalColor));
p.part("grid-v-0", b([12, 15, 940], [-800, -56, 1600]).color(stainlessSteel));
p.part("grid-v-1", b([12, 15, 940], [-600, -56, 1600]).color(stainlessSteel));
p.part("grid-v-2", b([12, 15, 940], [-400, -56, 1600]).color(stainlessSteel));
p.part("grid-v-3", b([12, 15, 940], [-200, -56, 1600]).color(stainlessSteel));
p.part("grid-v-4", b([12, 15, 940], [0, -56, 1600]).color(stainlessSteel));
p.part("grid-v-5", b([12, 15, 940], [200, -56, 1600]).color(stainlessSteel));
p.part("grid-v-6", b([12, 15, 940], [400, -56, 1600]).color(stainlessSteel));
p.part("grid-v-7", b([12, 15, 940], [600, -56, 1600]).color(stainlessSteel));
p.part("grid-v-8", b([12, 15, 940], [800, -56, 1600]).color(stainlessSteel));

return p.model();
