// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "airless-coating-pump-cart",
  license: "CC0-1.0",
  title: "Airless coating pump cart",
  description: "Mobile coating pump with motor block, pressure manifold, hose reel, guarded wheels, and a pull handle. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#b57848", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("airless-coating-pump-cart");

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

B("cart-base", [1300, 780, 160], [0, 0, 80]);
B("pump-body", [560, 480, 620], [-250, 0, 470]);
B("motor", [540, 420, 500], [340, 0, 410]);
C("hose-reel", 170, 340, [400, 0, 1050], [90, 0, 0], 14);
C("cart-wheel-0", 100, 190, [-520, -320, 190], [90, 0, 0], 10);
C("cart-wheel-1", 100, 190, [520, -320, 190], [90, 0, 0], 10);
C("cart-wheel-2", 100, 190, [-520, 320, 190], [90, 0, 0], 10);
C("cart-wheel-3", 100, 190, [520, 320, 190], [90, 0, 0], 10);
B("manifold", [620, 150, 200], [-260, -310, 880]);
B("pull-handle", [90, 700, 90], [-650, 0, 770]);

return p.model();
