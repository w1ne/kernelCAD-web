// Dockside work platform: Raised quay-side work deck with four legs, perimeter rails, a toe board, and a short access step. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "dockside-work-platform",
  license: 'CC0-1.0',
  title: "Dockside work platform",
  description: "Raised quay-side work deck with four legs, perimeter rails, a toe board, and a short access step. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "dockside", "work", "platform"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#667e79", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#829591", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#556964", "structuralSteel": "#828d91"},
});

const p = assembly("dockside-work-platform");
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

p.part("deck", b("deck", [2200, 1350, 150], [0, 0, 1190]).color(yardPaint));
p.part("support-leg-0", b("support-leg-0", [120, 120, 1120], [-950, -520, 560]).color(structuralSteel));
p.part("support-leg-1", b("support-leg-1", [120, 120, 1120], [950, -520, 560]).color(structuralSteel));
p.part("support-leg-2", b("support-leg-2", [120, 120, 1120], [-950, 520, 560]).color(structuralSteel));
p.part("support-leg-3", b("support-leg-3", [120, 120, 1120], [950, 520, 560]).color(structuralSteel));
p.part("rail-post-0", b("rail-post-0", [75, 75, 650], [-950, -520, 1510]).color(structuralSteel));
p.part("rail-post-1", b("rail-post-1", [75, 75, 650], [0, -520, 1510]).color(structuralSteel));
p.part("rail-post-2", b("rail-post-2", [75, 75, 650], [950, -520, 1510]).color(structuralSteel));
p.part("rail-post-3", b("rail-post-3", [75, 75, 650], [-950, 520, 1510]).color(structuralSteel));
p.part("rail-post-4", b("rail-post-4", [75, 75, 650], [0, 520, 1510]).color(structuralSteel));
p.part("rail-post-5", b("rail-post-5", [75, 75, 650], [950, 520, 1510]).color(structuralSteel));
p.part("guardrail-0", b("guardrail-0", [920, 65, 75], [-475, -520, 1780]).color(structuralSteel));
p.part("guardrail-1", b("guardrail-1", [920, 65, 75], [475, -520, 1780]).color(structuralSteel));
p.part("guardrail-2", b("guardrail-2", [920, 65, 75], [-475, 520, 1780]).color(structuralSteel));
p.part("guardrail-3", b("guardrail-3", [920, 65, 75], [475, 520, 1780]).color(structuralSteel));
p.part("toe-board", b("toe-board", [2200, 60, 140], [0, -650, 1335]).color(yardPaint));
p.part("access-step", b("access-step", [740, 420, 130], [0, -820, 65]).color(structuralSteel));

return p.model();
