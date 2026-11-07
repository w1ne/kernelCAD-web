// Shipfitter tool cabinet: Steel shop cabinet with paired doors, shallow drawer bank, top work surface, and a side-hung tool rail. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "shipfitter-tool-cabinet",
  license: 'CC0-1.0',
  title: "Shipfitter tool cabinet",
  description: "Steel shop cabinet with paired doors, shallow drawer bank, top work surface, and a side-hung tool rail. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "shipfitter", "tool", "cabinet"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#947656", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#a78f74", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#7b6247", "structuralSteel": "#828d91"},
});

const p = assembly("shipfitter-tool-cabinet");
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

p.part("cabinet-body", b("cabinet-body", [1260, 650, 1330], [0, 0, 745]).color(yardPaint));
p.part("toe-kick", b("toe-kick", [1310, 700, 150], [0, 0, 75]).color(yardPaint));
p.part("worktop", b("worktop", [1430, 800, 140], [0, 0, 1480]).color(yardPaint));
p.part("door-0", b("door-0", [550, 45, 850], [-300, -330, 860]).color(yardPaint));
p.part("door-1", b("door-1", [550, 45, 850], [300, -330, 860]).color(yardPaint));
p.part("drawer-0", b("drawer-0", [1080, 60, 120], [0, -360, 240]).color(yardPaint));
p.part("drawer-1", b("drawer-1", [1080, 60, 120], [0, -360, 405]).color(yardPaint));
p.part("drawer-2", b("drawer-2", [1080, 60, 120], [0, -360, 570]).color(yardPaint));
p.part("side-tool-rail", b("side-tool-rail", [100, 480, 90], [680, 0, 1080]).color(structuralSteel));
p.part("foot-0", b("foot-0", [130, 130, 180], [-510, -250, 90]).color(structuralSteel));
p.part("foot-1", b("foot-1", [130, 130, 180], [510, -250, 90]).color(structuralSteel));
p.part("foot-2", b("foot-2", [130, 130, 180], [-510, 250, 90]).color(structuralSteel));
p.part("foot-3", b("foot-3", [130, 130, 180], [510, 250, 90]).color(structuralSteel));

return p.model();
