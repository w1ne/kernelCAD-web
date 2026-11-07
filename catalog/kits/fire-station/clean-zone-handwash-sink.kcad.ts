// Clean-zone handwash sink: Compact wall basin with splashback, hands-free control and soap dispenser. Millimetres, Z up, base origin.
meta({
  name: "clean-zone-handwash-sink",
  license: 'CC0-1.0',
  title: "Clean-zone handwash sink",
  description: "Compact wall basin with splashback, hands-free control and soap dispenser. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean-zone", "handwash", "sink"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#aebbc0", { label: "Stainless steel" });
const polypropylene = param("polypropylene", "#eee9dd", { label: "Polypropylene" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'apparatus-red': {"stainlessSteel": "#c3c9cc", "polypropylene": "#eee9dd", "elastomer": "#252a2d"},
  'clean-zone': {"stainlessSteel": "#d0d8db", "polypropylene": "#f2eee2", "elastomer": "#30383b"},
});
const p = assembly("clean-zone-handwash-sink");

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
const sinkBasin = (size: [number, number, number], at: [number, number, number]) => {
  const t = Math.min(48, size[1] * 0.1, size[2] * 0.25);
  const cutHeight = size[2] - t + 20;
  const cavity = box(size[0] - 2 * t, size[1] - 2 * t, cutHeight, true)
    .translate(0, 0, -size[2] / 2 + t + cutHeight / 2);
  const shell = profiledBox(size[0], size[1], size[2]).subtract(cavity);
  p.part('basin-shell', shell.translate(at[0], at[1], at[2]).scale(scale).color(stainlessSteel));
  p.part('basin-drain', c(8, Math.max(22, t * 0.48), 10, [at[0], at[1], at[2] - size[2] / 2 + t]).color(stainlessSteel));
  p.part('basin-drain-gasket', c(3, Math.max(24, t * 0.55), 10, [at[0], at[1], at[2] - size[2] / 2 + t + 8]).color(elastomer));
  p.part('basin-drain-plug', b([Math.max(34, t * 0.9), Math.max(34, t * 0.9), 6], [at[0], at[1], at[2] - size[2] / 2 + t + 7]).color(polypropylene));
};

sinkBasin([700, 460, 170], [0, 0, 900]);
p.part("splashback", b([720, 58, 500], [0, 185, 1100]).color(stainlessSteel));
p.part("wall-bracket", b([500, 80, 75], [0, 190, 785]).color(stainlessSteel));
p.part("tap", c(240, 25, 8, [0, 110, 990]).color(stainlessSteel));
p.part("soap-dispenser", b([130, 120, 250], [360, 135, 1160]).color(polypropylene));
p.part("towel-dispenser", b([230, 115, 360], [-340, 125, 1200]).color(polypropylene));
p.part("pedestal-leg-0", b([60, 60, 770], [-255, -140, 385]).color(stainlessSteel));
p.part("pedestal-leg-1", b([60, 60, 770], [255, -140, 385]).color(stainlessSteel));
p.part('tap-spout', c(180, 16, 8, [0, 110, 1165], [1, 0, 0], 90).color(stainlessSteel));

return p.model();
