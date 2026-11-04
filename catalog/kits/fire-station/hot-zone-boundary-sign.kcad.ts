// Hot-zone boundary sign: Wall sign marking the transition from apparatus contamination zone to clean spaces. Millimetres, Z up, wall origin.
meta({
  name: "hot-zone-boundary-sign",
  license: 'CC0-1.0',
  title: "Hot-zone boundary sign",
  description: "Wall sign marking the transition from apparatus contamination zone to clean spaces. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "hot-zone", "boundary", "sign"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b4bec3", { label: "Stainless steel" });
const signalColor = param("signalColor", "#f0bf38", { label: "Safety color" });

presets({
  'apparatus-red': {"stainlessSteel": "#c3c9cc", "signalColor": "#f3c83d"},
  'clean-zone': {"stainlessSteel": "#d0d8db", "signalColor": "#f2c642"},
});
const p = assembly("hot-zone-boundary-sign");

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

p.part("sign-panel", b([920, 48, 440], [0, 0, 1660]).color(signalColor));
p.part("top-header", b([920, 70, 100], [0, 0, 1930]).color(stainlessSteel));
p.part("left-mount", b([60, 90, 120], [-380, 30, 1350]).color(stainlessSteel));
p.part("right-mount", b([60, 90, 120], [380, 30, 1350]).color(stainlessSteel));
p.part("zone-bar-0", b([180, 28, 38], [-280, -28, 1540]).color(signalColor));
p.part("zone-bar-1", b([180, 28, 38], [0, -28, 1540]).color(signalColor));
p.part("zone-bar-2", b([180, 28, 38], [280, -28, 1540]).color(signalColor));

return p.model();
