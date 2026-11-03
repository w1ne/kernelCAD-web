// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "shipfitter-tool-cabinet",
  license: "CC0-1.0",
  title: "Shipfitter tool cabinet",
  description: "Steel shop cabinet with paired doors, shallow drawer bank, top work surface, and a side-hung tool rail. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#947656", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("shipfitter-tool-cabinet");

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

B("cabinet-body", [1260, 650, 1330], [0, 0, 745]);
B("toe-kick", [1310, 700, 150], [0, 0, 75]);
B("worktop", [1430, 800, 140], [0, 0, 1480]);
B("door-0", [550, 45, 850], [-300, -330, 860]);
B("door-1", [550, 45, 850], [300, -330, 860]);
B("drawer-0", [1080, 60, 120], [0, -360, 240]);
B("drawer-1", [1080, 60, 120], [0, -360, 405]);
B("drawer-2", [1080, 60, 120], [0, -360, 570]);
B("side-tool-rail", [100, 480, 90], [680, 0, 1080]);
B("foot-0", [130, 130, 180], [-510, -250, 90]);
B("foot-1", [130, 130, 180], [510, -250, 90]);
B("foot-2", [130, 130, 180], [-510, 250, 90]);
B("foot-3", [130, 130, 180], [510, 250, 90]);

return p.model();
