// Hull block paint booth: Walk-in coating-bay frame with a wide entry, roof trusses, side curtains, and a raised extraction plenum. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "hull-block-paint-booth",
  license: 'CC0-1.0',
  title: "Hull block paint booth",
  description: "Walk-in coating-bay frame with a wide entry, roof trusses, side curtains, and a raised extraction plenum. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "hull", "block", "paint", "booth"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#77867e", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#8f9c95", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#636f69", "structuralSteel": "#828d91"},
});

const p = assembly("hull-block-paint-booth");
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

p.part("corner-post-0", b("corner-post-0", [130, 130, 2780], [-1500, -1100, 1390]).color(structuralSteel));
p.part("corner-post-1", b("corner-post-1", [130, 130, 2780], [1500, -1100, 1390]).color(structuralSteel));
p.part("corner-post-2", b("corner-post-2", [130, 130, 2780], [-1500, 1100, 1390]).color(structuralSteel));
p.part("corner-post-3", b("corner-post-3", [130, 130, 2780], [1500, 1100, 1390]).color(structuralSteel));
p.part("roof-joist-0", b("roof-joist-0", [130, 2200, 140], [-1000, 0, 2810]).color(structuralSteel));
p.part("roof-joist-1", b("roof-joist-1", [130, 2200, 140], [0, 0, 2810]).color(structuralSteel));
p.part("roof-joist-2", b("roof-joist-2", [130, 2200, 140], [1000, 0, 2810]).color(structuralSteel));
p.part("side-curtain-0", b("side-curtain-0", [90, 1850, 2500], [-1500, 0, 1440]).color(yardPaint));
p.part("side-curtain-1", b("side-curtain-1", [90, 1850, 2500], [1500, 0, 1440]).color(yardPaint));
p.part("extraction-plenum", b("extraction-plenum", [2760, 500, 260], [0, 0, 3050]).color(yardPaint));
p.part("entry-guide-0", b("entry-guide-0", [90, 130, 1200], [-1410, -1110, 600]).color(structuralSteel));
p.part("entry-guide-1", b("entry-guide-1", [90, 130, 1200], [1410, -1110, 600]).color(structuralSteel));

return p.model();
