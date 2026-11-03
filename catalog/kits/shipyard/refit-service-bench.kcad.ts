// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "refit-service-bench",
  license: "CC0-1.0",
  title: "Refit service bench",
  description: "Repair bench with a heavy worktop, vise, drawer bank, tool backboard, and a lower storage shelf. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#8e775a", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("refit-service-bench");

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

B("worktop", [1950, 920, 160], [0, 0, 1020]);
B("bench-leg-0", [140, 140, 940], [-820, -350, 470]);
B("bench-leg-1", [140, 140, 940], [820, -350, 470]);
B("bench-leg-2", [140, 140, 940], [-820, 350, 470]);
B("bench-leg-3", [140, 140, 940], [820, 350, 470]);
B("lower-shelf", [1690, 720, 110], [0, 0, 250]);
B("backboard", [1900, 100, 880], [0, 400, 1540]);
B("vise-base", [380, 320, 110], [620, -80, 1155]);
B("vise-jaw-left", [90, 350, 180], [490, -100, 1300]);
B("vise-jaw-right", [90, 350, 180], [750, -100, 1300]);
B("drawer-0", [560, 60, 140], [-450, -480, 350]);
B("drawer-1", [560, 60, 140], [-450, -480, 540]);
B("drawer-2", [560, 60, 140], [-450, -480, 730]);
B("drawer-3", [560, 60, 140], [-450, -480, 920]);

return p.model();
