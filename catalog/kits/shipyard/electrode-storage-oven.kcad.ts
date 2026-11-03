// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "electrode-storage-oven",
  license: "CC0-1.0",
  title: "Electrode storage oven",
  description: "Shop-floor cabinet oven with insulated body, double doors, control panel, ventilation cap, and rack feet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#9b7454", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("electrode-storage-oven");

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

B("cabinet", [1120, 780, 1540], [0, 0, 830]);
B("toe-kick", [1180, 840, 150], [0, 0, 75]);
B("oven-door-0", [510, 55, 1280], [-270, -420, 880]);
B("oven-door-1", [510, 55, 1280], [270, -420, 880]);
B("control-panel", [240, 80, 520], [610, -430, 900]);
B("vent-cap", [360, 420, 160], [0, 0, 1680]);
B("rack-foot-0", [120, 130, 240], [-430, -280, 190]);
B("rack-foot-1", [120, 130, 240], [430, -280, 190]);
B("rack-foot-2", [120, 130, 240], [-430, 280, 190]);
B("rack-foot-3", [120, 130, 240], [430, 280, 190]);

return p.model();
