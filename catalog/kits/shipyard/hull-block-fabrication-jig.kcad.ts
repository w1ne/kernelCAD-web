// Hull block fabrication jig: Open box-section fixture with corner towers, transverse alignment beams, and replaceable block-contact pads. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "hull-block-fabrication-jig",
  license: 'CC0-1.0',
  title: "Hull block fabrication jig",
  description: "Open box-section fixture with corner towers, transverse alignment beams, and replaceable block-contact pads. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "hull", "block", "fabrication", "jig"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#657c78", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#819490", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#546764", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("hull-block-fabrication-jig");
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

p.part("base-rail-0", b("base-rail-0", [2700, 200, 190], [0, -1050, 95]).color(yardPaint));
p.part("base-rail-1", b("base-rail-1", [2700, 200, 190], [0, 1050, 95]).color(structuralSteel));
p.part("cross-rail-0", b("cross-rail-0", [180, 2200, 160], [-1000, 0, 190]).color(structuralSteel));
p.part("cross-rail-1", b("cross-rail-1", [180, 2200, 160], [0, 0, 190]).color(structuralSteel));
p.part("cross-rail-2", b("cross-rail-2", [180, 2200, 160], [1000, 0, 190]).color(structuralSteel));
p.part("corner-tower-0", b("corner-tower-0", [220, 250, 1260], [-1150, -900, 900]).color(structuralSteel));
p.part("corner-tower-1", b("corner-tower-1", [220, 250, 1260], [1150, -900, 900]).color(structuralSteel));
p.part("corner-tower-2", b("corner-tower-2", [220, 250, 1260], [-1150, 900, 900]).color(structuralSteel));
p.part("corner-tower-3", b("corner-tower-3", [220, 250, 1260], [1150, 900, 900]).color(structuralSteel));
p.part("alignment-beam-0", b("alignment-beam-0", [150, 2180, 180], [-930, 0, 1560]).color(structuralSteel));
p.part("alignment-beam-1", b("alignment-beam-1", [150, 2180, 180], [930, 0, 1560]).color(structuralSteel));
p.part("contact-pad-0", b("contact-pad-0", [380, 420, 120], [-930, -730, 1710]).color(elastomer));
p.part("contact-pad-1", b("contact-pad-1", [380, 420, 120], [930, -730, 1710]).color(elastomer));
p.part("contact-pad-2", b("contact-pad-2", [380, 420, 120], [-930, 730, 1710]).color(elastomer));
p.part("contact-pad-3", b("contact-pad-3", [380, 420, 120], [930, 730, 1710]).color(elastomer));

return p.model();
