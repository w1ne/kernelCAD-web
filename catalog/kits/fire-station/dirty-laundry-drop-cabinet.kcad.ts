// Dirty laundry drop cabinet: Wall-mounted lined chute cabinet with a swing flap and bag-retention rim. Millimetres, Z up, wall origin.
meta({
  name: "dirty-laundry-drop-cabinet",
  license: 'CC0-1.0',
  title: "Dirty laundry drop cabinet",
  description: "Wall-mounted lined chute cabinet with a swing flap and bag-retention rim. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "dirty", "laundry", "drop", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const signalColor = param("signalColor", "#f0bf38", { label: "Safety color" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "signalColor": "#f3c83d"},
  'clean-zone': {"powderCoat": "#4e8c87", "signalColor": "#f2c642"},
});
const p = assembly("dirty-laundry-drop-cabinet");

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

p.part("cabinet", b([780, 360, 920], [0, 0, 1300]).color(powderCoat));
p.part("front", b([720, 30, 760], [0, -194, 1300]).color(powderCoat));
p.part("drop-flap", b([540, 36, 150], [0, -235, 1660], [12, 0, 0]).color(powderCoat));
p.part("bag-rim", b([620, 260, 40], [0, 0, 820]).color(powderCoat));
p.part("label-plate", b([270, 24, 120], [0, -225, 1030]).color(signalColor));

return p.model();
