// Weld consumable issue cage: Lockable mesh-style store with framed walls, two shelves, a half-height counter, and a roof panel. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "weld-consumable-issue-cage",
  license: 'CC0-1.0',
  title: "Weld consumable issue cage",
  description: "Lockable mesh-style store with framed walls, two shelves, a half-height counter, and a roof panel. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "weld", "consumable", "issue", "cage"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#7a8580", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#929b97", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#656e6a", "structuralSteel": "#828d91"},
});

const p = assembly("weld-consumable-issue-cage");
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

p.part("corner-post-0", b("corner-post-0", [100, 100, 1750], [-950, -500, 875]).color(structuralSteel));
p.part("corner-post-1", b("corner-post-1", [100, 100, 1750], [950, -500, 875]).color(structuralSteel));
p.part("corner-post-2", b("corner-post-2", [100, 100, 1750], [-950, 500, 875]).color(structuralSteel));
p.part("corner-post-3", b("corner-post-3", [100, 100, 1750], [950, 500, 875]).color(structuralSteel));
p.part("roof", b("roof", [2050, 1150, 120], [0, 0, 1810]).color(yardPaint));
p.part("counter", b("counter", [1900, 520, 170], [0, -250, 620]).color(yardPaint));
p.part("storage-shelf-0", b("storage-shelf-0", [1800, 900, 100], [0, 0, 930]).color(structuralSteel));
p.part("storage-shelf-1", b("storage-shelf-1", [1800, 900, 100], [0, 0, 1350]).color(structuralSteel));
p.part("wall-rail-0", b("wall-rail-0", [1850, 70, 70], [0, -500, 480]).color(structuralSteel));
p.part("wall-rail-1", b("wall-rail-1", [1850, 70, 70], [0, 500, 480]).color(structuralSteel));
p.part("wall-rail-2", b("wall-rail-2", [1850, 70, 70], [0, -500, 1320]).color(structuralSteel));
p.part("wall-rail-3", b("wall-rail-3", [1850, 70, 70], [0, 500, 1320]).color(structuralSteel));
p.part("lockable-door", b("lockable-door", [620, 80, 1240], [-600, -560, 980]).color(structuralSteel));

return p.model();
