// Transition zone airlock bench: Compact wipe-clean bench with boot shelves and a dividing rail for gear transitions. Millimetres, Z up, base origin.
meta({
  name: "transition-zone-airlock-bench",
  license: 'CC0-1.0',
  title: "Transition zone airlock bench",
  description: "Compact wipe-clean bench with boot shelves and a dividing rail for gear transitions. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "transition", "zone", "airlock", "bench"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#637d83", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const elastomer = param("elastomer", "#303539", { label: "Elastomer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b"},
});
const p = assembly("transition-zone-airlock-bench");

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

p.part("seat", b([1400, 440, 70], [0, 0, 520]).color(powderCoat));
p.part("leg-0", b([70, 70, 500], [-620, -150, 250]).color(stainlessSteel));
p.part("leg-1", b([70, 70, 500], [620, -150, 250]).color(stainlessSteel));
p.part("leg-2", b([70, 70, 500], [-620, 150, 250]).color(stainlessSteel));
p.part("leg-3", b([70, 70, 500], [620, 150, 250]).color(stainlessSteel));
p.part("lower-shelf", b([1280, 360, 45], [0, 0, 205]).color(stainlessSteel));
p.part("divider", b([40, 430, 1100], [0, 205, 550]).color(powderCoat));
p.part("boot-slot-0", b([30, 335, 220], [-510, 0, 110]).color(elastomer));
p.part("boot-slot-1", b([30, 335, 220], [-340, 0, 110]).color(elastomer));
p.part("boot-slot-2", b([30, 335, 220], [-170, 0, 110]).color(elastomer));
p.part("boot-slot-3", b([30, 335, 220], [0, 0, 110]).color(elastomer));
p.part("boot-slot-4", b([30, 335, 220], [170, 0, 110]).color(elastomer));
p.part("boot-slot-5", b([30, 335, 220], [340, 0, 110]).color(elastomer));
p.part("boot-slot-6", b([30, 335, 220], [510, 0, 110]).color(elastomer));

return p.model();
