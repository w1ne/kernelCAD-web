// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "yard-material-tug-cart",
  license: "CC0-1.0",
  title: "Yard material tug cart",
  description: "Low powered yard tug with an open operator bay, tow hook, bumper rails, and chunky traction wheels. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#b87942", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("yard-material-tug-cart");

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

B("chassis", [1500, 850, 230], [0, 0, 410]);
B("operator-floor", [740, 720, 120], [-300, 0, 590]);
B("front-cowl", [620, 820, 600], [480, 0, 830]);
B("seat", [440, 460, 180], [-450, 0, 920]);
B("overhead-guard", [880, 760, 130], [-330, 0, 1640]);
C("traction-wheel-0", 190, 310, [-550, -490, 310], [90, 0, 0], 12);
C("traction-wheel-1", 190, 310, [550, -490, 310], [90, 0, 0], 12);
C("traction-wheel-2", 190, 310, [-550, 490, 310], [90, 0, 0], 12);
C("traction-wheel-3", 190, 310, [550, 490, 310], [90, 0, 0], 12);
B("tow-hook", [240, 180, 260], [-900, 0, 290]);
B("bumper", [180, 1000, 170], [870, 0, 250]);

return p.model();
