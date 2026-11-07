// Apparatus bay sectional door: Full-height sectional door assembly with side guides, horizontal panels and upper vision lites. Millimetres, Z up, base origin.
meta({
  name: "apparatus-bay-sectional-door",
  license: 'CC0-1.0',
  title: "Apparatus bay sectional door",
  description: "Full-height sectional door assembly with side guides, horizontal panels and upper vision lites. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "apparatus", "bay", "sectional", "door"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
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
const p = assembly("apparatus-bay-sectional-door");

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

p.part("left-guide", b([100, 100, 3300], [-1650, 0, 1650]).color(stainlessSteel));
p.part("right-guide", b([100, 100, 3300], [1650, 0, 1650]).color(stainlessSteel));
p.part("door-leaf", b([3100, 75, 2800], [0, 0, 1450]).color(powderCoat));
p.part("door-seam-1", b([3100, 18, 18], [0, -48, 610]).color(powderCoat));
p.part("door-seam-2", b([3100, 18, 18], [0, -48, 940]).color(powderCoat));
p.part("door-seam-3", b([3100, 18, 18], [0, -48, 1270]).color(powderCoat));
p.part("door-seam-4", b([3100, 18, 18], [0, -48, 1600]).color(powderCoat));
p.part("door-seam-5", b([3100, 18, 18], [0, -48, 1930]).color(powderCoat));
p.part("door-seam-6", b([3100, 18, 18], [0, -48, 2260]).color(powderCoat));
p.part("door-seam-7", b([3100, 18, 18], [0, -48, 2590]).color(powderCoat));
p.part("vision-lite-1", b([430, 18, 220], [-360, -50, 2470]).color(polymer));
p.part("vision-lite-2", b([430, 18, 220], [360, -50, 2470]).color(polymer));
p.part("vision-lite-3", b([430, 18, 220], [1080, -50, 2470]).color(polymer));
p.part("header", b([3400, 140, 180], [0, 0, 3210]).color(stainlessSteel));

return p.model();
