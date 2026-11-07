// Keel block stack: Stepped timber keel support stack with a broad foot, alternating crib layers, and a replaceable top cap. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "keel-block-stack",
  license: 'CC0-1.0',
  title: "Keel block stack",
  description: "Stepped timber keel support stack with a broad foot, alternating crib layers, and a replaceable top cap. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "keel", "block", "stack"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#9a714d", { label: "Timber" });
const timberEndGrain = param("timberEndGrain", "#bf9363", { label: "Timber end grain" });

presets({
  'fresh-coat': {"timber": "#a68262", "timberEndGrain": "#cba67f"},
  'weathered-yard': {"timber": "#846142", "timberEndGrain": "#ac8459"},
});

const p = assembly("keel-block-stack");
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

p.part("ground-sill", b("ground-sill", [1150, 700, 160], [0, 0, 80]).color(timber));
p.part("lower-block-left", b("lower-block-left", [420, 700, 260], [-350, 0, 290]).color(timber));
p.part("lower-block-right", b("lower-block-right", [420, 700, 260], [350, 0, 290]).color(timber));
p.part("cross-layer", b("cross-layer", [920, 560, 180], [0, 0, 510]).color(timber));
p.part("upper-block", b("upper-block", [650, 520, 250], [0, 0, 725]).color(timber));
p.part("keel-cap", b("keel-cap", [820, 620, 120], [0, 0, 910]).color(timber));
p.part("side-wedge-0", b("side-wedge-0", [170, 260, 100], [-260, -210, 1010]).color(timberEndGrain));
p.part("side-wedge-1", b("side-wedge-1", [170, 260, 100], [260, -210, 1010]).color(timberEndGrain));
p.part("side-wedge-2", b("side-wedge-2", [170, 260, 100], [-260, 210, 1010]).color(timberEndGrain));
p.part("side-wedge-3", b("side-wedge-3", [170, 260, 100], [260, 210, 1010]).color(timberEndGrain));

return p.model();
