// Pipe rack with fork pockets: Stackable pipe storage rack with upright dividers, fork pockets, a retaining rail, and a removable end stop. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "pipe-rack-fork-pocket",
  license: 'CC0-1.0',
  title: "Pipe rack with fork pockets",
  description: "Stackable pipe storage rack with upright dividers, fork pockets, a retaining rail, and a removable end stop. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "pipe", "rack", "with", "fork", "pockets"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#70827b", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#8a9893", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5d6c66", "structuralSteel": "#828d91"},
});

const p = assembly("pipe-rack-fork-pocket");
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

p.part("base-skid-0", b("base-skid-0", [2600, 180, 180], [0, -600, 90]).color(structuralSteel));
p.part("base-skid-1", b("base-skid-1", [2600, 180, 180], [0, 600, 90]).color(structuralSteel));
p.part("divider-0", b("divider-0", [150, 1120, 740], [-1000, 0, 550]).color(structuralSteel));
p.part("divider-1", b("divider-1", [150, 1120, 740], [-500, 0, 550]).color(structuralSteel));
p.part("divider-2", b("divider-2", [150, 1120, 740], [0, 0, 550]).color(structuralSteel));
p.part("divider-3", b("divider-3", [150, 1120, 740], [500, 0, 550]).color(structuralSteel));
p.part("divider-4", b("divider-4", [150, 1120, 740], [1000, 0, 550]).color(structuralSteel));
p.part("fork-pocket-0", b("fork-pocket-0", [420, 300, 240], [-700, 0, 210]).color(structuralSteel));
p.part("fork-pocket-1", b("fork-pocket-1", [420, 300, 240], [700, 0, 210]).color(structuralSteel));
p.part("retaining-rail", b("retaining-rail", [2700, 120, 170], [0, 620, 920]).color(structuralSteel));
p.part("removable-stop", b("removable-stop", [130, 1160, 850], [1320, 0, 500]).color(yardPaint));

return p.model();
