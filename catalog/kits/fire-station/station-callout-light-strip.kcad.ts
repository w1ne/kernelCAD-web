// Station callout light strip: Hallway callout light bar with three labeled response-zone indicators. Millimetres, Z up, wall origin.
meta({
  name: "station-callout-light-strip",
  license: 'CC0-1.0',
  title: "Station callout light strip",
  description: "Hallway callout light bar with three labeled response-zone indicators. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "callout", "light", "strip"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#405467", { label: "Powder coat" });
const redLens = param("redLens", "#d43c40", { label: "Red lens" });
const amberLens = param("amberLens", "#f0b634", { label: "Amber lens" });
const greenLens = param("greenLens", "#42a66b", { label: "Green lens" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "redLens": "#d93e42", "amberLens": "#f0b634", "greenLens": "#41a66b"},
  'clean-zone': {"powderCoat": "#4e8c87", "redLens": "#d83e42", "amberLens": "#f1b836", "greenLens": "#40a76c"},
});
const p = assembly("station-callout-light-strip");

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

p.part("backplate", b([1450, 60, 160], [0, 0, 1900]).color(powderCoat));
p.part("lens-0", b([350, 28, 80], [-480, -42, 1900]).color(redLens));
p.part("lens-1", b([350, 28, 80], [0, -42, 1900]).color(amberLens));
p.part("lens-2", b([350, 28, 80], [480, -42, 1900]).color(greenLens));
p.part("label-0", b([300, 18, 52], [-480, -44, 1780]).color(powderCoat));
p.part("label-1", b([300, 18, 52], [0, -44, 1780]).color(powderCoat));
p.part("label-2", b([300, 18, 52], [480, -44, 1780]).color(powderCoat));
p.part("mount-left", b([70, 90, 120], [-620, 0, 1790]).color(powderCoat));
p.part("mount-right", b([70, 90, 120], [620, 0, 1790]).color(powderCoat));

return p.model();
