// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "mobile-hull-access-platform",
  license: "CC0-1.0",
  title: "Mobile hull access platform",
  description: "Low rolling work deck with adjustable-height posts, guard rails, end stops, and a central access step. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#71847e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("mobile-hull-access-platform");

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

B("deck", [1760, 1080, 150], [0, 0, 660]);
B("lift-post-0", [120, 120, 560], [-700, -400, 300]);
B("lift-post-1", [120, 120, 560], [700, -400, 300]);
B("lift-post-2", [120, 120, 560], [-700, 400, 300]);
B("lift-post-3", [120, 120, 560], [700, 400, 300]);
B("guard-post-0", [80, 80, 620], [-700, -400, 1045]);
B("guard-post-1", [80, 80, 620], [0, -400, 1045]);
B("guard-post-2", [80, 80, 620], [700, -400, 1045]);
B("guard-post-3", [80, 80, 620], [-700, 400, 1045]);
B("guard-post-4", [80, 80, 620], [0, 400, 1045]);
B("guard-post-5", [80, 80, 620], [700, 400, 1045]);
B("guard-rail-0", [700, 65, 75], [-350, -400, 1300]);
B("guard-rail-1", [700, 65, 75], [350, -400, 1300]);
B("guard-rail-2", [700, 65, 75], [-350, 400, 1300]);
B("guard-rail-3", [700, 65, 75], [350, 400, 1300]);
C("wheel-0", 110, 150, [-750, -460, 150], [90, 0, 0], 10);
C("wheel-1", 110, 150, [750, -460, 150], [90, 0, 0], 10);
C("wheel-2", 110, 150, [-750, 460, 150], [90, 0, 0], 10);
C("wheel-3", 110, 150, [750, 460, 150], [90, 0, 0], 10);
B("access-step", [620, 330, 130], [0, -680, 65]);

return p.model();
