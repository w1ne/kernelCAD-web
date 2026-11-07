// Floating drydock pontoon module: Modular floating dock section with paired buoyancy tanks, a deck bridge, side fender blocks, and a boarding ladder. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "floating-drydock-pontoon-module",
  license: 'CC0-1.0',
  title: "Floating drydock pontoon module",
  description: "Modular floating dock section with paired buoyancy tanks, a deck bridge, side fender blocks, and a boarding ladder. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "floating", "pontoon", "module"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#728985", { label: "Yard finish" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#8b9e9b", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#5f726e", "elastomer": "#252b2d"},
});

const p = assembly("floating-drydock-pontoon-module");
const originOffsetMm = 0;

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
const taperedBox = (w: number, d: number, h: number) => {
  const bottom = panelProfile(w * 0.68, d * 0.68, Math.min(w, d) * 0.05);
  const top = panelProfile(w, d, Math.min(w, d) * 0.08);
  return bottom.loft(top, { spacing: h, ruled: true }).translate(0, 0, -h / 2);
};
const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = /^(bin-body|hopper-body|collection-bin)$/.test(name) ? taperedBox(size[0], size[1], size[2]) : profiledBox(size[0], size[1], size[2]);
  if (rotation?.[0]) shape = shape.rotateX(rotation[0]);
  if (rotation?.[1]) shape = shape.rotateY(rotation[1]);
  if (rotation?.[2]) shape = shape.rotateZ(rotation[2]);
  return shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
};

p.part("pontoon-0", b("pontoon-0", [1900, 470, 580], [0, -580, 290]).color(yardPaint));
p.part("pontoon-1", b("pontoon-1", [1900, 470, 580], [0, 580, 290]).color(yardPaint));
p.part("deck-bridge", b("deck-bridge", [1980, 870, 160], [0, 0, 660]).color(yardPaint));
p.part("fender-0", b("fender-0", [240, 170, 420], [-650, -840, 580]).color(elastomer));
p.part("fender-1", b("fender-1", [240, 170, 420], [650, -840, 580]).color(elastomer));
p.part("fender-2", b("fender-2", [240, 170, 420], [-650, 840, 580]).color(elastomer));
p.part("fender-3", b("fender-3", [240, 170, 420], [650, 840, 580]).color(elastomer));
p.part("ladder-rung-0", b("ladder-rung-0", [420, 100, 75], [0, -845, 240]).color(yardPaint));
p.part("ladder-rung-1", b("ladder-rung-1", [420, 100, 75], [0, -845, 470]).color(yardPaint));
p.part("ladder-rung-2", b("ladder-rung-2", [420, 100, 75], [0, -845, 700]).color(yardPaint));
p.part("ladder-rung-3", b("ladder-rung-3", [420, 100, 75], [0, -845, 930]).color(yardPaint));
p.part("ladder-side-left", b("ladder-side-left", [70, 100, 850], [-210, -845, 545]).color(yardPaint));
p.part("ladder-side-right", b("ladder-side-right", [70, 100, 850], [210, -845, 545]).color(yardPaint));

return p.model();
