// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "hull-profile-template-rack",
  license: "CC0-1.0",
  title: "Hull profile template rack",
  description: "A-frame storage rack for reusable hull-section templates with separated bays, base rails, and end stops. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#8f795e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("hull-profile-template-rack");

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

B("base-runner-0", [1950, 180, 160], [0, -500, 80]);
B("base-runner-1", [1950, 180, 160], [0, 500, 80]);
B("divider-0", [125, 1100, 1660], [-800, 0, 830]);
B("divider-1", [125, 1100, 1660], [-400, 0, 830]);
B("divider-2", [125, 1100, 1660], [0, 0, 830]);
B("divider-3", [125, 1100, 1660], [400, 0, 830]);
B("divider-4", [125, 1100, 1660], [800, 0, 830]);
B("template-0", [70, 860, 1320], [-800, 0, 1490]);
B("template-1", [70, 860, 1320], [-400, 0, 1490]);
B("template-2", [70, 860, 1320], [0, 0, 1490]);
B("template-3", [70, 860, 1320], [400, 0, 1490]);
B("top-restraint", [1780, 130, 130], [0, 0, 1710]);
B("end-stop", [120, 1050, 520], [960, 0, 420]);

return p.model();
