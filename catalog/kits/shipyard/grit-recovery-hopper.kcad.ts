// Grit recovery hopper: Low collection hopper with a sloped bin body, discharge cone, fork pockets, and removable screen deck. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "grit-recovery-hopper",
  license: 'CC0-1.0',
  title: "Grit recovery hopper",
  description: "Low collection hopper with a sloped bin body, discharge cone, fork pockets, and removable screen deck. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "grit", "recovery", "hopper"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#8c765c", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#a18f79", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#74624c", "structuralSteel": "#828d91"},
});

const p = assembly("grit-recovery-hopper");
const originOffsetMm = 10;

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

p.part("bin-body", b("bin-body", [1580, 1200, 980], [0, 0, 680]).color(yardPaint));
p.part("screen-deck", b("screen-deck", [1680, 1300, 120], [0, 0, 1240]).color(yardPaint));
p.part("discharge-neck", b("discharge-neck", [620, 520, 330], [0, 0, 200]).color(yardPaint));
p.part("fork-pocket-left", b("fork-pocket-left", [350, 300, 190], [-530, 0, 130]).color(structuralSteel));
p.part("fork-pocket-right", b("fork-pocket-right", [350, 300, 190], [530, 0, 130]).color(structuralSteel));
p.part("screen-rib-0", b("screen-rib-0", [1520, 45, 60], [0, -560, 1330]).color(structuralSteel));
p.part("screen-rib-1", b("screen-rib-1", [1520, 45, 60], [0, -340, 1330]).color(structuralSteel));
p.part("screen-rib-2", b("screen-rib-2", [1520, 45, 60], [0, -120, 1330]).color(structuralSteel));
p.part("screen-rib-3", b("screen-rib-3", [1520, 45, 60], [0, 100, 1330]).color(structuralSteel));
p.part("screen-rib-4", b("screen-rib-4", [1520, 45, 60], [0, 320, 1330]).color(structuralSteel));
p.part("screen-rib-5", b("screen-rib-5", [1520, 45, 60], [0, 540, 1330]).color(structuralSteel));
p.part("outlet-flange", b("outlet-flange", [700, 620, 90], [0, 0, 35]).color(structuralSteel));

return p.model();
