// Dock gate caisson: Floating drydock gate module with a broad caisson body, stiffening ribs, deck walkway, and paired ballast housings. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "dock-gate-caisson",
  license: 'CC0-1.0',
  title: "Dock gate caisson",
  description: "Floating drydock gate module with a broad caisson body, stiffening ribs, deck walkway, and paired ballast housings. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "dock", "gate", "caisson"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#748987", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const buoyancyCoat = param("buoyancyCoat", "#4c969b", { label: "Buoyancy coating" });

presets({
  'fresh-coat': {"yardPaint": "#8d9e9d", "structuralSteel": "#d0d7d8", "buoyancyCoat": "#68b4b6"},
  'weathered-yard': {"yardPaint": "#607270", "structuralSteel": "#828d91", "buoyancyCoat": "#337277"},
});

const p = assembly("dock-gate-caisson");
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

p.part("gate-body", b("gate-body", [2800, 340, 1900], [0, 0, 950]).color(yardPaint));
p.part("deck-cap", b("deck-cap", [2940, 470, 150], [0, 0, 1975]).color(yardPaint));
p.part("vertical-stiffener-0", b("vertical-stiffener-0", [120, 150, 1800], [-1100, -225, 900]).color(structuralSteel));
p.part("vertical-stiffener-1", b("vertical-stiffener-1", [120, 150, 1800], [-660, -225, 900]).color(structuralSteel));
p.part("vertical-stiffener-2", b("vertical-stiffener-2", [120, 150, 1800], [-220, -225, 900]).color(structuralSteel));
p.part("vertical-stiffener-3", b("vertical-stiffener-3", [120, 150, 1800], [220, -225, 900]).color(structuralSteel));
p.part("vertical-stiffener-4", b("vertical-stiffener-4", [120, 150, 1800], [660, -225, 900]).color(structuralSteel));
p.part("vertical-stiffener-5", b("vertical-stiffener-5", [120, 150, 1800], [1100, -225, 900]).color(structuralSteel));
p.part("lower-flotation-cell-0", b("lower-flotation-cell-0", [500, 620, 360], [-720, 0, 180]).color(buoyancyCoat));
p.part("lower-flotation-cell-1", b("lower-flotation-cell-1", [500, 620, 360], [720, 0, 180]).color(buoyancyCoat));
p.part("deck-cleat-0", b("deck-cleat-0", [150, 100, 120], [-950, -205, 2110]).color(structuralSteel));
p.part("deck-cleat-1", b("deck-cleat-1", [150, 100, 120], [950, -205, 2110]).color(structuralSteel));

return p.model();
