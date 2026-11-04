// Boot wash scrubber: Low boot-cleaning station with two tread brushes, splash guards and a drain pan. Millimetres, Z up, base origin.
meta({
  name: "boot-wash-scrubber",
  license: 'CC0-1.0',
  title: "Boot wash scrubber",
  description: "Low boot-cleaning station with two tread brushes, splash guards and a drain pan. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "boot", "wash", "scrubber"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4b8984", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const elastomer = param("elastomer", "#303539", { label: "Elastomer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b"},
});
const p = assembly("boot-wash-scrubber");

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

p.part("pan", b([760, 520, 90], [0, 0, 45]).color(stainlessSteel));
p.part("left-brush", b([230, 400, 180], [-175, 0, 180]).color(elastomer));
p.part("right-brush", b([230, 400, 180], [175, 0, 180]).color(elastomer));
p.part("rear-splash", b([760, 48, 260], [0, 230, 220]).color(powderCoat));
p.part("brush-ridge-0", b([28, 355, 16], [-245, 0, 278]).color(elastomer));
p.part("brush-ridge-1", b([28, 355, 16], [-175, 0, 278]).color(elastomer));
p.part("brush-ridge-2", b([28, 355, 16], [-105, 0, 278]).color(elastomer));
p.part("brush-ridge-3", b([28, 355, 16], [-35, 0, 278]).color(elastomer));
p.part("brush-ridge-4", b([28, 355, 16], [35, 0, 278]).color(elastomer));
p.part("brush-ridge-5", b([28, 355, 16], [105, 0, 278]).color(elastomer));
p.part("brush-ridge-6", b([28, 355, 16], [175, 0, 278]).color(elastomer));
p.part("brush-ridge-7", b([28, 355, 16], [245, 0, 278]).color(elastomer));

return p.model();
