// Bay column protector: Low two-sided guard around a structural post with beveled top caps. Millimetres, Z up, base origin.
meta({
  name: "bay-column-protector",
  license: 'CC0-1.0',
  title: "Bay column protector",
  description: "Low two-sided guard around a structural post with beveled top caps. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "bay", "column", "protector"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#d58e17", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#9ea9ae", { label: "Stainless steel" });
const elastomer = param("elastomer", "#282e31", { label: "Elastomer" });
const signalColor = param("signalColor", "#f3ce38", { label: "Safety marking" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d", "signalColor": "#f3c83d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b", "signalColor": "#f2c642"},
});
const p = assembly("bay-column-protector");

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

p.part("front-guard", b([700, 105, 620], [0, -205, 310]).color(powderCoat));
p.part("side-guard", b([105, 520, 620], [-298, 0, 310]).color(powderCoat));
p.part("top-cap-front", b([730, 125, 48], [0, -205, 596]).color(stainlessSteel));
p.part("top-cap-side", b([125, 520, 48], [-298, 0, 596]).color(stainlessSteel));
p.part("stripe-0", b([68, 18, 400], [-245, -265, 310], [0, 0, -20]).color(signalColor));
p.part("stripe-1", b([68, 18, 400], [-100, -265, 310], [0, 0, -20]).color(elastomer));
p.part("stripe-2", b([68, 18, 400], [45, -265, 310], [0, 0, -20]).color(signalColor));
p.part("stripe-3", b([68, 18, 400], [190, -265, 310], [0, 0, -20]).color(elastomer));

return p.model();
