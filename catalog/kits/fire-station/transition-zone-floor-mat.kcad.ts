// Transition zone floor mat: Low slip-resistant walk-off mat with a raised tread pattern and beveled rim. Millimetres, Z up, base origin.
meta({
  name: "transition-zone-floor-mat",
  license: 'CC0-1.0',
  title: "Transition zone floor mat",
  description: "Low slip-resistant walk-off mat with a raised tread pattern and beveled rim. Editable scale and material colors; use the apparatus-red or clean-zone finish preset.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "transition", "zone", "floor", "mat"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const elastomer = param("elastomer", "#343a3c", { label: "Elastomer" });
const signalColor = param("signalColor", "#e2a423", { label: "Safety marking" });

presets({
  'apparatus-red': {"elastomer": "#252a2d", "signalColor": "#f3c83d"},
  'clean-zone': {"elastomer": "#30383b", "signalColor": "#f2c642"},
});
const p = assembly("transition-zone-floor-mat");

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

p.part("mat", b([1600, 920, 22], [0, 0, 11]).color(elastomer));
p.part("tread-0", b([28, 840, 6], [-730, 0, 25]).color(elastomer));
p.part("tread-1", b([28, 840, 6], [-625, 0, 25]).color(elastomer));
p.part("tread-2", b([28, 840, 6], [-520, 0, 25]).color(elastomer));
p.part("tread-3", b([28, 840, 6], [-415, 0, 25]).color(elastomer));
p.part("tread-4", b([28, 840, 6], [-310, 0, 25]).color(elastomer));
p.part("tread-5", b([28, 840, 6], [-205, 0, 25]).color(elastomer));
p.part("tread-6", b([28, 840, 6], [-100, 0, 25]).color(elastomer));
p.part("tread-7", b([28, 840, 6], [5, 0, 25]).color(elastomer));
p.part("tread-8", b([28, 840, 6], [110, 0, 25]).color(elastomer));
p.part("tread-9", b([28, 840, 6], [215, 0, 25]).color(elastomer));
p.part("tread-10", b([28, 840, 6], [320, 0, 25]).color(elastomer));
p.part("tread-11", b([28, 840, 6], [425, 0, 25]).color(elastomer));
p.part("tread-12", b([28, 840, 6], [530, 0, 25]).color(elastomer));
p.part("tread-13", b([28, 840, 6], [635, 0, 25]).color(elastomer));
p.part("front-rim", b([1600, 28, 28], [0, -460, 14]).color(signalColor));
p.part("back-rim", b([1600, 28, 28], [0, 460, 14]).color(signalColor));

return p.model();
