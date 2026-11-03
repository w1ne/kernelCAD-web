// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "coating-climate-monitor-stand",
  license: "CC0-1.0",
  title: "Coating climate monitor stand",
  description: "Portable environmental monitor on a mast with a weather shield, sample ports, and a weighted base. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d3a64b", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("coating-climate-monitor-stand");

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
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("base", [650, 650, 150], [0, 0, 75]);
B("mast", [100, 100, 1470], [0, 0, 885]);
B("monitor-case", [550, 380, 620], [0, -80, 1790]);
B("weather-shield", [680, 510, 130], [0, -80, 2165]);
C("sample-port-0", 120, 65, [-150, -310, 1630], [90, 0, 0], 8);
C("sample-port-1", 120, 65, [150, -310, 1630], [90, 0, 0], 8);
B("probe-arm", [100, 760, 100], [320, 180, 1450]);
B("cable-clip", [150, 110, 110], [140, -100, 1120]);

return p.model();
