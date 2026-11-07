// Station maintenance workbench: Shop bench with tool backboard, vise, drawer bank and parts tray. Millimetres, Z up, base origin.
meta({
  name: "station-maintenance-workbench",
  license: 'CC0-1.0',
  title: "Station maintenance workbench",
  description: "Shop bench with tool backboard, vise, drawer bank and parts tray. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "maintenance", "workbench"],
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
const p = assembly("station-maintenance-workbench");

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

p.part("worktop", b([1800, 760, 80], [0, 0, 900]).color(powderCoat));
p.part("leg-0", b([75, 75, 880], [-790, -310, 440]).color(stainlessSteel));
p.part("leg-1", b([75, 75, 880], [790, -310, 440]).color(stainlessSteel));
p.part("leg-2", b([75, 75, 880], [-790, 310, 440]).color(stainlessSteel));
p.part("leg-3", b([75, 75, 880], [790, 310, 440]).color(stainlessSteel));
p.part("drawer-bank", b([540, 690, 390], [-520, 0, 640]).color(powderCoat));
p.part("backboard", b([1800, 55, 920], [0, 340, 1400]).color(powderCoat));
p.part("vise-base", b([220, 220, 170], [550, -120, 1025]).color(powderCoat));
p.part("vise-jaw", b([280, 200, 90], [550, -120, 1155]).color(powderCoat));
p.part("parts-tray", b([430, 260, 55], [-220, 65, 970]).color(stainlessSteel));

return p.model();
