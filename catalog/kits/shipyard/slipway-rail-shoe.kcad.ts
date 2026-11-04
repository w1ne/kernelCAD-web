// Slipway rail shoe: Short paired launch-way rails on timber sleepers with replaceable guide shoes and a stop block. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "slipway-rail-shoe",
  license: 'CC0-1.0',
  title: "Slipway rail shoe",
  description: "Short paired launch-way rails on timber sleepers with replaceable guide shoes and a stop block. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "slipway", "rail", "shoe"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#75827c", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const timber = param("timber", "#9a714d", { label: "Timber" });

presets({
  'fresh-coat': {"yardPaint": "#8e9894", "structuralSteel": "#d0d7d8", "timber": "#a68262"},
  'weathered-yard': {"yardPaint": "#616c67", "structuralSteel": "#828d91", "timber": "#846142"},
});

const p = assembly("slipway-rail-shoe");
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

p.part("rail-0", b("rail-0", [2300, 120, 190], [0, -440, 220]).color(structuralSteel));
p.part("rail-1", b("rail-1", [2300, 120, 190], [0, 440, 220]).color(structuralSteel));
p.part("sleeper-0", b("sleeper-0", [220, 1120, 170], [-900, 0, 85]).color(timber));
p.part("sleeper-1", b("sleeper-1", [220, 1120, 170], [-300, 0, 85]).color(timber));
p.part("sleeper-2", b("sleeper-2", [220, 1120, 170], [300, 0, 85]).color(timber));
p.part("sleeper-3", b("sleeper-3", [220, 1120, 170], [900, 0, 85]).color(timber));
p.part("wear-shoe-0", b("wear-shoe-0", [850, 170, 55], [-600, -440, 345]).color(yardPaint));
p.part("wear-shoe-1", b("wear-shoe-1", [850, 170, 55], [600, -440, 345]).color(yardPaint));
p.part("wear-shoe-2", b("wear-shoe-2", [850, 170, 55], [-600, 440, 345]).color(yardPaint));
p.part("wear-shoe-3", b("wear-shoe-3", [850, 170, 55], [600, 440, 345]).color(yardPaint));
p.part("end-stop", b("end-stop", [180, 1120, 320], [1080, 0, 440]).color(yardPaint));

return p.model();
