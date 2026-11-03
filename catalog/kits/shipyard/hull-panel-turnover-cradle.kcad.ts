// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "hull-panel-turnover-cradle",
  license: "CC0-1.0",
  title: "Hull panel turnover cradle",
  description: "Pair of curved-looking turnover frames joined by a central axle beam with four stabilizing feet and panel stops. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#70837d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("hull-panel-turnover-cradle");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("end-frame-0", [180, 1340, 1550], [-850, 0, 775]);
B("end-frame-1", [180, 1340, 1550], [850, 0, 775]);
B("turnover-axle", [1840, 170, 170], [0, 0, 1130]);
B("saddle-arm-0", [220, 220, 1280], [-850, -520, 980]);
B("saddle-arm-1", [220, 220, 1280], [-850, 520, 980]);
B("saddle-arm-2", [220, 220, 1280], [850, -520, 980]);
B("saddle-arm-3", [220, 220, 1280], [850, 520, 980]);
B("panel-stop-0", [260, 260, 180], [-850, -520, 1670]);
B("panel-stop-1", [260, 260, 180], [-850, 520, 1670]);
B("panel-stop-2", [260, 260, 180], [850, -520, 1670]);
B("panel-stop-3", [260, 260, 180], [850, 520, 1670]);
B("stabilizer-foot-0", [480, 400, 120], [-850, -680, 60]);
B("stabilizer-foot-1", [480, 400, 120], [850, -680, 60]);
B("stabilizer-foot-2", [480, 400, 120], [-850, 680, 60]);
B("stabilizer-foot-3", [480, 400, 120], [850, 680, 60]);

return p.model();
