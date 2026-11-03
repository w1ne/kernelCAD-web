// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "keel-block-stack",
  license: "CC0-1.0",
  title: "Keel block stack",
  description: "Stepped timber keel support stack with a broad foot, alternating crib layers, and a replaceable top cap. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#a17d58", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("keel-block-stack");

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

B("ground-sill", [1150, 700, 160], [0, 0, 80]);
B("lower-block-left", [420, 700, 260], [-350, 0, 290]);
B("lower-block-right", [420, 700, 260], [350, 0, 290]);
B("cross-layer", [920, 560, 180], [0, 0, 510]);
B("upper-block", [650, 520, 250], [0, 0, 725]);
B("keel-cap", [820, 620, 120], [0, 0, 910]);
B("side-wedge-0", [170, 260, 100], [-260, -210, 1010]);
B("side-wedge-1", [170, 260, 100], [260, -210, 1010]);
B("side-wedge-2", [170, 260, 100], [-260, 210, 1010]);
B("side-wedge-3", [170, 260, 100], [260, 210, 1010]);

return p.model();
