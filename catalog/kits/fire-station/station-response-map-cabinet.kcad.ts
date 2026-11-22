// Station response map cabinet: Wall map cabinet with hinged cover, grid insert and route-card pockets. Millimetres, Z up, wall origin.
meta({
  name: "station-response-map-cabinet",
  license: 'CC0-1.0',
  title: "Station response map cabinet",
  description: "Wall map cabinet with hinged cover, grid insert and route-card pockets. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "response", "map", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4c7089", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const signalColor = param("signalColor", "#f0bf38", { label: "Safety color" });
const polymer = param("polymer", "#e8e4d9", { label: "Polymer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "signalColor": "#f3c83d", "polymer": "#e8e4d9"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "signalColor": "#f2c642", "polymer": "#ece9e1"},
});
const p = assembly("station-response-map-cabinet");

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

p.part("backboard", b([1500, 70, 1100], [0, 0, 1650]).color(powderCoat));
p.part("map-panel", b([1350, 30, 850], [0, -52, 1670]).color(signalColor));
p.part("cover", b([1420, 42, 940], [0, -88, 1670]).color(polymer));
p.part("route-pocket-0", b([350, 36, 240], [-480, -115, 1210]).color(powderCoat));
p.part("route-pocket-1", b([350, 36, 240], [0, -115, 1210]).color(powderCoat));
p.part("route-pocket-2", b([350, 36, 240], [480, -115, 1210]).color(powderCoat));
p.part("hinge-top", b([1320, 40, 50], [0, 18, 2130]).color(stainlessSteel));
p.part("hinge-bottom", b([1320, 40, 50], [0, 18, 1190]).color(stainlessSteel));

return p.model();
