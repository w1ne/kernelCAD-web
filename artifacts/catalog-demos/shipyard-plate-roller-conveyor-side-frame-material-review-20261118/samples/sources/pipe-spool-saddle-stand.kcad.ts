// Pipe spool saddle stand: Adjustable pipe support with a broad base, twin uprights, saddle crossbar, locking collars, and storage tray. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "pipe-spool-saddle-stand",
  license: 'CC0-1.0',
  title: "Pipe spool saddle stand",
  description: "Adjustable pipe support with a broad base, twin uprights, saddle crossbar, locking collars, and storage tray. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "pipe", "spool", "saddle", "stand"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#778780", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#8f9d97", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#63706a", "structuralSteel": "#828d91"},
});

const p = assembly("pipe-spool-saddle-stand");
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

p.part("base", b("base", [1600, 700, 150], [0, 0, 75]).color(yardPaint));
p.part("upright-0", b("upright-0", [130, 150, 980], [-560, 0, 640]).color(structuralSteel));
p.part("upright-1", b("upright-1", [130, 150, 980], [560, 0, 640]).color(structuralSteel));
p.part("saddle-crossbar", b("saddle-crossbar", [1420, 240, 180], [0, 0, 1190]).color(structuralSteel));
p.part("saddle-cap", b("saddle-cap", [950, 280, 170], [0, 0, 1365]).color(structuralSteel));
p.part("locking-collar-0", b("locking-collar-0", [230, 210, 120], [-560, 0, 940]).color(structuralSteel));
p.part("locking-collar-1", b("locking-collar-1", [230, 210, 120], [560, 0, 940]).color(structuralSteel));
p.part("tool-tray", b("tool-tray", [1200, 430, 100], [0, -150, 230]).color(structuralSteel));

return p.model();
