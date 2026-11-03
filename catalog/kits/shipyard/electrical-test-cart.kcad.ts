// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "electrical-test-cart",
  license: "CC0-1.0",
  title: "Electrical test cart",
  description: "Mobile electrical checkout cart with a control panel, cable hooks, guarded wheels, and a lower instrument shelf. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#667d7a", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("electrical-test-cart");

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

B("cart-deck", [1160, 740, 130], [0, 0, 420]);
B("panel-cabinet", [800, 360, 900], [0, 80, 930]);
B("panel-door", [680, 55, 700], [0, -115, 960]);
C("indicator-0", 55, 45, [-230, -160, 1210], [90, 0, 0], 8);
C("indicator-1", 55, 45, [-80, -160, 1210], [90, 0, 0], 8);
C("indicator-2", 55, 45, [70, -160, 1210], [90, 0, 0], 8);
C("indicator-3", 55, 45, [220, -160, 1210], [90, 0, 0], 8);
B("instrument-shelf", [980, 420, 100], [0, 80, 220]);
B("push-handle", [80, 700, 100], [-560, 80, 1100]);
C("cart-wheel-0", 80, 150, [-500, -300, 150], [90, 0, 0], 10);
C("cart-wheel-1", 80, 150, [500, -300, 150], [90, 0, 0], 10);
C("cart-wheel-2", 80, 150, [-500, 300, 150], [90, 0, 0], 10);
C("cart-wheel-3", 80, 150, [500, 300, 150], [90, 0, 0], 10);
B("cable-hook-0", [90, 160, 330], [-250, 420, 1160]);
B("cable-hook-1", [90, 160, 330], [250, 420, 1160]);

return p.model();
