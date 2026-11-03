// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "paint-booth-filter-wall",
  license: "CC0-1.0",
  title: "Paint booth filter wall",
  description: "Replaceable filter bank with modular frames, intake panels, a lower return plenum, and service feet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#6e8179", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("paint-booth-filter-wall");

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

B("filter-frame-0", [1050, 120, 1840], [-1050, 0, 920]);
B("filter-frame-1", [1050, 120, 1840], [-350, 0, 920]);
B("filter-frame-2", [1050, 120, 1840], [350, 0, 920]);
B("filter-frame-3", [1050, 120, 1840], [1050, 0, 920]);
B("filter-panel-0", [650, 70, 1560], [-1050, -80, 900]);
B("filter-panel-1", [650, 70, 1560], [-350, -80, 900]);
B("filter-panel-2", [650, 70, 1560], [350, -80, 900]);
B("filter-panel-3", [650, 70, 1560], [1050, -80, 900]);
B("return-plenum", [3600, 440, 320], [0, 0, 160]);
B("service-foot-0", [250, 360, 120], [-1600, 0, 60]);
B("service-foot-1", [250, 360, 120], [1600, 0, 60]);
B("top-cap", [3650, 300, 140], [0, 0, 1920]);

return p.model();
