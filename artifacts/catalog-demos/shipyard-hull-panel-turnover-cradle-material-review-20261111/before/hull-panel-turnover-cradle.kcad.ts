// Hull panel turnover cradle: Pair of curved-looking turnover frames joined by a central axle beam with four stabilizing feet and panel stops. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "hull-panel-turnover-cradle",
  license: 'CC0-1.0',
  title: "Hull panel turnover cradle",
  description: "Pair of curved-looking turnover frames joined by a central axle beam with four stabilizing feet and panel stops. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "hull", "panel", "turnover", "cradle"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#70837d", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#8a9994", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5d6d68", "structuralSteel": "#828d91"},
});

const p = assembly("hull-panel-turnover-cradle");
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

p.part("end-frame-0", b("end-frame-0", [180, 1340, 1550], [-850, 0, 775]).color(yardPaint));
p.part("end-frame-1", b("end-frame-1", [180, 1340, 1550], [850, 0, 775]).color(structuralSteel));
p.part("turnover-axle", b("turnover-axle", [1840, 170, 170], [0, 0, 1130]).color(structuralSteel));
p.part("saddle-arm-0", b("saddle-arm-0", [220, 220, 1280], [-850, -520, 980]).color(structuralSteel));
p.part("saddle-arm-1", b("saddle-arm-1", [220, 220, 1280], [-850, 520, 980]).color(structuralSteel));
p.part("saddle-arm-2", b("saddle-arm-2", [220, 220, 1280], [850, -520, 980]).color(structuralSteel));
p.part("saddle-arm-3", b("saddle-arm-3", [220, 220, 1280], [850, 520, 980]).color(structuralSteel));
p.part("panel-stop-0", b("panel-stop-0", [260, 260, 180], [-850, -520, 1670]).color(structuralSteel));
p.part("panel-stop-1", b("panel-stop-1", [260, 260, 180], [-850, 520, 1670]).color(structuralSteel));
p.part("panel-stop-2", b("panel-stop-2", [260, 260, 180], [850, -520, 1670]).color(structuralSteel));
p.part("panel-stop-3", b("panel-stop-3", [260, 260, 180], [850, 520, 1670]).color(structuralSteel));
p.part("stabilizer-foot-0", b("stabilizer-foot-0", [480, 400, 120], [-850, -680, 60]).color(structuralSteel));
p.part("stabilizer-foot-1", b("stabilizer-foot-1", [480, 400, 120], [850, -680, 60]).color(structuralSteel));
p.part("stabilizer-foot-2", b("stabilizer-foot-2", [480, 400, 120], [-850, 680, 60]).color(structuralSteel));
p.part("stabilizer-foot-3", b("stabilizer-foot-3", [480, 400, 120], [850, 680, 60]).color(structuralSteel));

return p.model();
