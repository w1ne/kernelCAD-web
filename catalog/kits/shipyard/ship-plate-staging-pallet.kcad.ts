// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "ship-plate-staging-pallet",
  license: "CC0-1.0",
  title: "Ship plate staging pallet",
  description: "Heavy plate pallet with fork pockets, layered sheet stock, end stops, and corner restraint blocks. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73817e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("ship-plate-staging-pallet");

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

B("pallet-base", [2500, 1420, 160], [0, 0, 80]);
B("fork-pocket-0", [420, 480, 120], [-720, 0, 220]);
B("fork-pocket-1", [420, 480, 120], [720, 0, 220]);
B("plate-layer-0", [2320, 1260, 48], [0, 0, 300]);
B("plate-layer-1", [2320, 1260, 48], [0, 0, 358]);
B("plate-layer-2", [2320, 1260, 48], [0, 0, 416]);
B("plate-layer-3", [2320, 1260, 48], [0, 0, 474]);
B("plate-layer-4", [2320, 1260, 48], [0, 0, 532]);
B("plate-layer-5", [2320, 1260, 48], [0, 0, 590]);
B("plate-layer-6", [2320, 1260, 48], [0, 0, 648]);
B("end-stop-0", [120, 1320, 500], [-1190, 0, 350]);
B("end-stop-1", [120, 1320, 500], [1190, 0, 350]);

return p.model();
