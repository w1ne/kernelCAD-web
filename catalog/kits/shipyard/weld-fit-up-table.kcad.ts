// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "weld-fit-up-table",
  license: "CC0-1.0",
  title: "Weld fit-up table",
  description: "Heavy fit-up surface with a grid of clamp slots represented by raised stops, fixture dogs, and a lower shelf. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#687c78", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("weld-fit-up-table");

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

B("table-top", [1760, 1160, 180], [0, 0, 1160]);
B("fixture-stop-0", [110, 110, 190], [-650, -400, 1345]);
B("fixture-stop-1", [110, 110, 190], [-220, -400, 1345]);
B("fixture-stop-2", [110, 110, 190], [220, -400, 1345]);
B("fixture-stop-3", [110, 110, 190], [650, -400, 1345]);
B("fixture-stop-4", [110, 110, 190], [-650, 400, 1345]);
B("fixture-stop-5", [110, 110, 190], [-220, 400, 1345]);
B("fixture-stop-6", [110, 110, 190], [220, 400, 1345]);
B("fixture-stop-7", [110, 110, 190], [650, 400, 1345]);
B("table-leg-0", [130, 130, 1080], [-720, -450, 540]);
B("table-leg-1", [130, 130, 1080], [720, -450, 540]);
B("table-leg-2", [130, 130, 1080], [-720, 450, 540]);
B("table-leg-3", [130, 130, 1080], [720, 450, 540]);
B("lower-shelf", [1440, 820, 100], [0, 0, 260]);

return p.model();
