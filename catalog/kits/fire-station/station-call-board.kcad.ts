// Station call assignment board: Wall board with unit-ready columns, crew cards and a magnetic incident strip. Millimetres, Z up, wall origin.
meta({
  name: "station-call-board",
  license: 'CC0-1.0',
  title: "Station call assignment board",
  description: "Wall board with unit-ready columns, crew cards and a magnetic incident strip. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "call", "assignment", "board"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#456981", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#9ea9ae", { label: "Stainless steel" });
const paper = param("paper", "#f0ead9", { label: "Paper" });
const signalColor = param("signalColor", "#edb93c", { label: "Signal color" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "paper": "#f4efdf", "signalColor": "#f3c83d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "paper": "#f4efdf", "signalColor": "#f2c642"},
});
const p = assembly("station-call-board");

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

p.part("backboard", b([1600, 46, 940], [0, 0, 1580]).color(powderCoat));
p.part("top-title", b([1600, 38, 130], [0, -40, 2070]).color(signalColor));
p.part("column-0", b([30, 20, 730], [-520, -40, 1570]).color(stainlessSteel));
p.part("column-1", b([30, 20, 730], [-260, -40, 1570]).color(stainlessSteel));
p.part("column-2", b([30, 20, 730], [0, -40, 1570]).color(stainlessSteel));
p.part("column-3", b([30, 20, 730], [260, -40, 1570]).color(stainlessSteel));
p.part("column-4", b([30, 20, 730], [520, -40, 1570]).color(stainlessSteel));
p.part("crew-card-0", b([210, 20, 110], [-520, -68, 1740]).color(paper));
p.part("crew-card-1", b([210, 20, 110], [-260, -68, 1740]).color(paper));
p.part("crew-card-2", b([210, 20, 110], [0, -68, 1740]).color(paper));
p.part("crew-card-3", b([210, 20, 110], [260, -68, 1740]).color(paper));
p.part("crew-card-4", b([210, 20, 110], [520, -68, 1740]).color(paper));
p.part("incident-strip", b([1480, 28, 90], [0, -54, 1050]).color(signalColor));

return p.model();
