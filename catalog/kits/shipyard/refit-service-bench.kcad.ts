// Refit service bench: Repair bench with a heavy worktop, vise, drawer bank, tool backboard, and a lower storage shelf. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "refit-service-bench",
  license: 'CC0-1.0',
  title: "Refit service bench",
  description: "Repair bench with a heavy worktop, vise, drawer bank, tool backboard, and a lower storage shelf. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "service", "bench"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#8e775a", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#a28f78", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#76634b", "structuralSteel": "#828d91"},
});

const p = assembly("refit-service-bench");
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

p.part("worktop", b("worktop", [1950, 920, 160], [0, 0, 1020]).color(yardPaint));
p.part("bench-leg-0", b("bench-leg-0", [140, 140, 940], [-820, -350, 470]).color(structuralSteel));
p.part("bench-leg-1", b("bench-leg-1", [140, 140, 940], [820, -350, 470]).color(structuralSteel));
p.part("bench-leg-2", b("bench-leg-2", [140, 140, 940], [-820, 350, 470]).color(structuralSteel));
p.part("bench-leg-3", b("bench-leg-3", [140, 140, 940], [820, 350, 470]).color(structuralSteel));
p.part("lower-shelf", b("lower-shelf", [1690, 720, 110], [0, 0, 250]).color(structuralSteel));
p.part("backboard", b("backboard", [1900, 100, 880], [0, 400, 1540]).color(yardPaint));
p.part("vise-base", b("vise-base", [380, 320, 110], [620, -80, 1155]).color(yardPaint));
p.part("vise-jaw-left", b("vise-jaw-left", [90, 350, 180], [490, -100, 1300]).color(yardPaint));
p.part("vise-jaw-right", b("vise-jaw-right", [90, 350, 180], [750, -100, 1300]).color(yardPaint));
p.part("drawer-0", b("drawer-0", [560, 60, 140], [-450, -480, 350]).color(yardPaint));
p.part("drawer-1", b("drawer-1", [560, 60, 140], [-450, -480, 540]).color(yardPaint));
p.part("drawer-2", b("drawer-2", [560, 60, 140], [-450, -480, 730]).color(yardPaint));
p.part("drawer-3", b("drawer-3", [560, 60, 140], [-450, -480, 920]).color(yardPaint));

return p.model();
