// Bay door control station: Wall-mounted open, stop and close controls with a protected manual-release handle. Millimetres, Z up, wall origin.
meta({
  name: "bay-door-control-station",
  license: 'CC0-1.0',
  title: "Bay door control station",
  description: "Wall-mounted open, stop and close controls with a protected manual-release handle. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "bay", "door", "control"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#486f83", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#b1bbc1", { label: "Stainless steel" });
const greenPolymer = param("greenPolymer", "#48a870", { label: "Green polymer" });
const redPolymer = param("redPolymer", "#d83f42", { label: "Red polymer" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "greenPolymer": "#48a870", "redPolymer": "#d83f42"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "greenPolymer": "#4da978", "redPolymer": "#d74343"},
});
const p = assembly("bay-door-control-station");

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
const ngon = (r: number, sides: number, rotation = 0) => {
  let profile = path().moveTo(r * Math.cos(rotation), r * Math.sin(rotation));
  for (let i = 1; i < sides; i++) {
    const angle = rotation + 2 * Math.PI * i / sides;
    profile = profile.lineTo(r * Math.cos(angle), r * Math.sin(angle));
  }
  return profile.close();
};
const profiledCylinder = (h: number, r: number, sides: number) =>
  ngon(r, sides).loft(ngon(r * 0.95, sides, Math.PI / sides), { spacing: h, ruled: true });
const c = (h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = profiledCylinder(h, r, segments);
  if (axis && degrees) {
    if (axis[0]) shape = shape.rotateX(degrees);
    else if (axis[1]) shape = shape.rotateY(degrees);
    else if (axis[2]) shape = shape.rotateZ(degrees);
  }
  return shape.translate(at[0], at[1], at[2]).scale(scale);
};

p.part("backplate", b([270, 70, 430], [0, 0, 1500]).color(stainlessSteel));
p.part("control-face", b([205, 24, 330], [0, -44, 1500]).color(powderCoat));
p.part("button-0", c(24, 28, 8, [-62, -66, 1600], [1, 0, 0], 90).color(greenPolymer));
p.part("button-1", c(24, 28, 8, [0, -66, 1600], [1, 0, 0], 90).color(redPolymer));
p.part("button-2", c(24, 28, 8, [62, -66, 1600], [1, 0, 0], 90).color(greenPolymer));
p.part("release-cover", b([92, 18, 150], [90, -62, 1430]).color(stainlessSteel));

return p.model();
