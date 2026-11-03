// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "drydock-access-stair-tower",
  license: "CC0-1.0",
  title: "Drydock access stair tower",
  description: "Compact access tower with a stepped flight, landing, twin handrails, and stabilizing base feet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#798881", { label: "Asset color" });
const originOffsetMm = -65;
const p = assembly("drydock-access-stair-tower");

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

B("landing", [1050, 820, 150], [0, 0, 1390]);
B("stair-tread-0", [820, 260, 110], [-760, -300, 120]);
B("stair-tread-1", [820, 260, 110], [-605, -300, 300]);
B("stair-tread-2", [820, 260, 110], [-450, -300, 480]);
B("stair-tread-3", [820, 260, 110], [-295, -300, 660]);
B("stair-tread-4", [820, 260, 110], [-140, -300, 840]);
B("stair-tread-5", [820, 260, 110], [15, -300, 1020]);
B("stair-tread-6", [820, 260, 110], [170, -300, 1200]);
B("stair-stringer-0", [1900, 110, 120], [-295, -430, 660], [0, -34, 0]);
B("stair-stringer-1", [1900, 110, 120], [-295, -170, 660], [0, -34, 0]);
B("landing-post-0", [80, 80, 1080], [-450, 340, 850]);
B("landing-post-1", [80, 80, 1080], [450, 340, 850]);
B("landing-post-2", [80, 80, 1080], [-450, -340, 850]);
B("landing-post-3", [80, 80, 1080], [450, -340, 850]);
B("handrail-0", [1000, 70, 85], [0, 340, 1400]);
B("handrail-1", [1000, 70, 85], [0, -340, 1400]);

return p.model();
