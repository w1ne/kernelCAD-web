// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "queue-switchback-rail",
  license: "CC0-1.0",
  title: "Queue switchback rail",
  description: "Modular two-lane queue divider with paired rails, seven posts, and a rounded turning end. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7c817a", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("queue-switchback-rail");

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

C("post-0", 980, 54, [-1500, -420, 0], [0, 0, 0], 8);
C("post-1", 980, 54, [-1000, -420, 0], [0, 0, 0], 8);
C("post-2", 980, 54, [-500, -420, 0], [0, 0, 0], 8);
C("post-3", 980, 54, [0, -420, 0], [0, 0, 0], 8);
C("post-4", 980, 54, [500, -420, 0], [0, 0, 0], 8);
C("post-5", 980, 54, [1000, -420, 0], [0, 0, 0], 8);
C("post-6", 980, 54, [1500, -420, 0], [0, 0, 0], 8);
C("post-7", 980, 54, [-1500, 420, 0], [0, 0, 0], 8);
C("post-8", 980, 54, [-1000, 420, 0], [0, 0, 0], 8);
C("post-9", 980, 54, [-500, 420, 0], [0, 0, 0], 8);
C("post-10", 980, 54, [0, 420, 0], [0, 0, 0], 8);
C("post-11", 980, 54, [500, 420, 0], [0, 0, 0], 8);
C("post-12", 980, 54, [1000, 420, 0], [0, 0, 0], 8);
C("post-13", 980, 54, [1500, 420, 0], [0, 0, 0], 8);
B("upper-rail-0", [470, 65, 65], [-1250, -420, 840]);
B("upper-rail-1", [470, 65, 65], [-750, -420, 840]);
B("upper-rail-2", [470, 65, 65], [-250, -420, 840]);
B("upper-rail-3", [470, 65, 65], [250, -420, 840]);
B("upper-rail-4", [470, 65, 65], [750, -420, 840]);
B("upper-rail-5", [470, 65, 65], [1250, -420, 840]);
B("upper-rail-6", [470, 65, 65], [-1250, 420, 840]);
B("upper-rail-7", [470, 65, 65], [-750, 420, 840]);
B("upper-rail-8", [470, 65, 65], [-250, 420, 840]);
B("upper-rail-9", [470, 65, 65], [250, 420, 840]);
B("upper-rail-10", [470, 65, 65], [750, 420, 840]);
B("upper-rail-11", [470, 65, 65], [1250, 420, 840]);
B("lower-rail-0", [470, 55, 55], [-1250, -420, 430]);
B("lower-rail-1", [470, 55, 55], [-750, -420, 430]);
B("lower-rail-2", [470, 55, 55], [-250, -420, 430]);
B("lower-rail-3", [470, 55, 55], [250, -420, 430]);
B("lower-rail-4", [470, 55, 55], [750, -420, 430]);
B("lower-rail-5", [470, 55, 55], [1250, -420, 430]);
B("lower-rail-6", [470, 55, 55], [-1250, 420, 430]);
B("lower-rail-7", [470, 55, 55], [-750, 420, 430]);
B("lower-rail-8", [470, 55, 55], [-250, 420, 430]);
B("lower-rail-9", [470, 55, 55], [250, 420, 430]);
B("lower-rail-10", [470, 55, 55], [750, 420, 430]);
B("lower-rail-11", [470, 55, 55], [1250, 420, 430]);

return p.model();
