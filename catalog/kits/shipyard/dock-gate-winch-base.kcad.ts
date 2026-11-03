// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "dock-gate-winch-base",
  license: "CC0-1.0",
  title: "Dock gate winch base",
  description: "Drive stand for a floating-gate hauling line with twin cable drums, a motor housing, a brake lever, and a reinforced skid. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#a56848", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("dock-gate-winch-base");

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

B("skid", [1900, 980, 180], [0, 0, 90]);
B("motor", [620, 620, 650], [570, 0, 505]);
C("haul-drum-0", 560, 260, [-500, -390, 340], [90, 0, 0], 14);
C("haul-drum-1", 560, 260, [-500, 390, 340], [90, 0, 0], 14);
B("drum-bearing-0", [180, 200, 680], [-500, -610, 440]);
B("drum-bearing-1", [180, 200, 680], [-500, 610, 440]);
B("brake-lever", [75, 720, 75], [-160, 360, 660]);
B("guard-cover", [720, 260, 120], [-500, 0, 780]);

return p.model();
