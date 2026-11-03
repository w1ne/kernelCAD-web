// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "bow-section-support-stand",
  license: "CC0-1.0",
  title: "Bow section support stand",
  description: "Reusable steel cradle with paired inclined-looking uprights, a high cross head, base shoes, and a broad saddle pad. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7b8980", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("bow-section-support-stand");

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

B("base-beam", [1900, 520, 180], [0, 0, 90]);
B("left-foot", [260, 440, 120], [-650, 0, 240]);
B("right-foot", [260, 440, 120], [650, 0, 240]);
B("left-post", [190, 240, 1130], [-620, 0, 825]);
B("right-post", [190, 240, 1130], [620, 0, 825]);
B("head-beam", [1650, 330, 220], [0, 0, 1390]);
B("saddle", [1050, 760, 150], [0, 0, 1575]);
B("rear-brace", [1350, 150, 130], [0, 220, 810]);

return p.model();
