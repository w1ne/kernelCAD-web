// Ship plate staging pallet: Heavy plate pallet with fork pockets, layered sheet stock, end stops, and corner restraint blocks. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "ship-plate-staging-pallet",
  license: 'CC0-1.0',
  title: "Ship plate staging pallet",
  description: "Heavy plate pallet with fork pockets, layered sheet stock, end stops, and corner restraint blocks. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "ship", "plate", "staging", "pallet"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#73817e", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#8c9895", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5f6b69", "structuralSteel": "#828d91"},
});

const p = assembly("ship-plate-staging-pallet");
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

p.part("pallet-base", b("pallet-base", [2500, 1420, 160], [0, 0, 80]).color(yardPaint));
p.part("fork-pocket-0", b("fork-pocket-0", [420, 480, 120], [-720, 0, 220]).color(structuralSteel));
p.part("fork-pocket-1", b("fork-pocket-1", [420, 480, 120], [720, 0, 220]).color(structuralSteel));
p.part("plate-layer-0", b("plate-layer-0", [2320, 1260, 48], [0, 0, 300]).color(structuralSteel));
p.part("plate-layer-1", b("plate-layer-1", [2320, 1260, 48], [0, 0, 358]).color(structuralSteel));
p.part("plate-layer-2", b("plate-layer-2", [2320, 1260, 48], [0, 0, 416]).color(structuralSteel));
p.part("plate-layer-3", b("plate-layer-3", [2320, 1260, 48], [0, 0, 474]).color(structuralSteel));
p.part("plate-layer-4", b("plate-layer-4", [2320, 1260, 48], [0, 0, 532]).color(structuralSteel));
p.part("plate-layer-5", b("plate-layer-5", [2320, 1260, 48], [0, 0, 590]).color(structuralSteel));
p.part("plate-layer-6", b("plate-layer-6", [2320, 1260, 48], [0, 0, 648]).color(structuralSteel));
p.part("end-stop-0", b("end-stop-0", [120, 1320, 500], [-1190, 0, 350]).color(structuralSteel));
p.part("end-stop-1", b("end-stop-1", [120, 1320, 500], [1190, 0, 350]).color(structuralSteel));

return p.model();
