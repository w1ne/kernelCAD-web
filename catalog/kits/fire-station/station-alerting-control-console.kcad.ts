// Station alerting control console: Duty desk panel with incident display, station status buttons and speaker grille. Millimetres, Z up, base origin.
meta({
  name: "station-alerting-control-console",
  license: 'CC0-1.0',
  title: "Station alerting control console",
  description: "Duty desk panel with incident display, station status buttons and speaker grille. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "alerting", "control", "console"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#4d718c", { label: "Powder coat" });
const stainlessSteel = param("stainlessSteel", "#aeb9c0", { label: "Stainless steel" });
const screenGlass = param("screenGlass", "#23353d", { label: "Display glass" });
const signalColor = param("signalColor", "#f0bd36", { label: "Signal color" });

presets({
  'apparatus-red': {"powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "screenGlass": "#23353d", "signalColor": "#f3c83d"},
  'clean-zone': {"powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "screenGlass": "#263943", "signalColor": "#f2c642"},
});
const p = assembly("station-alerting-control-console");

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

p.part("desk-base", b([1100, 720, 760], [0, 0, 380]).color(powderCoat));
p.part("worktop", b([1400, 840, 80], [0, 0, 800]).color(powderCoat));
p.part("raised-console", b([990, 230, 300], [0, 250, 970]).color(powderCoat));
p.part("display", b([520, 50, 330], [-260, 125, 1110], [-10, 0, 0]).color(screenGlass));
p.part("status-button-0", c(28, 36, 8, [180, -48, 1000]).color(signalColor));
p.part("status-button-1", c(28, 36, 8, [300, -48, 1000]).color(signalColor));
p.part("status-button-2", c(28, 36, 8, [420, -48, 1000]).color(signalColor));
p.part("speaker-grille", b([245, 24, 105], [0, 118, 965]).color(stainlessSteel));

return p.model();
