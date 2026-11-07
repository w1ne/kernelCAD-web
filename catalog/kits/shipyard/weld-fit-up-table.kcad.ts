// Weld fit-up table: Heavy fit-up surface with a grid of clamp slots represented by raised stops, fixture dogs, and a lower shelf. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "weld-fit-up-table",
  license: 'CC0-1.0',
  title: "Weld fit-up table",
  description: "Heavy fit-up surface with a grid of clamp slots represented by raised stops, fixture dogs, and a lower shelf. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "weld", "fit-up", "table"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#687c78", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#839490", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#566764", "structuralSteel": "#828d91"},
});

const p = assembly("weld-fit-up-table");
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

p.part("table-top", b("table-top", [1760, 1160, 180], [0, 0, 1160]).color(yardPaint));
p.part("fixture-stop-0", b("fixture-stop-0", [110, 110, 190], [-650, -400, 1345]).color(structuralSteel));
p.part("fixture-stop-1", b("fixture-stop-1", [110, 110, 190], [-220, -400, 1345]).color(structuralSteel));
p.part("fixture-stop-2", b("fixture-stop-2", [110, 110, 190], [220, -400, 1345]).color(structuralSteel));
p.part("fixture-stop-3", b("fixture-stop-3", [110, 110, 190], [650, -400, 1345]).color(structuralSteel));
p.part("fixture-stop-4", b("fixture-stop-4", [110, 110, 190], [-650, 400, 1345]).color(structuralSteel));
p.part("fixture-stop-5", b("fixture-stop-5", [110, 110, 190], [-220, 400, 1345]).color(structuralSteel));
p.part("fixture-stop-6", b("fixture-stop-6", [110, 110, 190], [220, 400, 1345]).color(structuralSteel));
p.part("fixture-stop-7", b("fixture-stop-7", [110, 110, 190], [650, 400, 1345]).color(structuralSteel));
p.part("table-leg-0", b("table-leg-0", [130, 130, 1080], [-720, -450, 540]).color(structuralSteel));
p.part("table-leg-1", b("table-leg-1", [130, 130, 1080], [720, -450, 540]).color(structuralSteel));
p.part("table-leg-2", b("table-leg-2", [130, 130, 1080], [-720, 450, 540]).color(structuralSteel));
p.part("table-leg-3", b("table-leg-3", [130, 130, 1080], [720, 450, 540]).color(structuralSteel));
p.part("lower-shelf", b("lower-shelf", [1440, 820, 100], [0, 0, 260]).color(structuralSteel));

return p.model();
