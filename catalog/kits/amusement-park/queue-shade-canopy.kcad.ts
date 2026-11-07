// Queue shade canopy: Open-sided queue shelter with four posts, a peaked roof silhouette, and hanging wayfinding tabs.
meta({
  name: "queue-shade-canopy",
  license: "CC0-1.0",
  title: "Queue shade canopy",
  description: "Open-sided queue shelter with four posts, a peaked roof silhouette, and hanging wayfinding tabs. Controls: overall scale, steel, canvas, enamel; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#738087", { label: "Painted steel" });
const canvas = param("canvas", "#e0c98e", { label: "Canvas" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });

presets({
  festival: {
    "steel": "#9da3a0",
    "canvas": "#eddaa9",
    "enamel": "#edb34d"
},
  twilight: {
    "steel": "#4f626c",
    "canvas": "#a85e4f",
    "enamel": "#385b81"
},
});
const originOffsetMm = 0;
const p = assembly("queue-shade-canopy");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if ([].includes(name)) p.part(name, positioned.color(steel));
  else if (["left-roof-slope", "queue-tab-0", "queue-tab-1", "queue-tab-2", "queue-tab-3", "right-roof-slope"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["post-0", "post-1", "post-2", "post-3", "ridge-beam"].includes(name)) p.part(name, positioned.color(canvas));
  else p.part(name, positioned.color(steel));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("post-0", [95, 95, 2700], [-1600, -540, 1350]);
B("post-1", [95, 95, 2700], [1600, -540, 1350]);
B("post-2", [95, 95, 2700], [-1600, 540, 1350]);
B("post-3", [95, 95, 2700], [1600, 540, 1350]);
B("left-roof-slope", [1920, 1250, 130], [-800, 0, 2750], [0, 0, -8]);
B("right-roof-slope", [1920, 1250, 130], [800, 0, 2750], [0, 0, 8]);
B("ridge-beam", [3600, 120, 130], [0, 0, 2980]);
B("queue-tab-0", [220, 90, 290], [-1100, -610, 2440]);
B("queue-tab-1", [220, 90, 290], [-370, -610, 2440]);
B("queue-tab-2", [220, 90, 290], [360, -610, 2440]);
B("queue-tab-3", [220, 90, 290], [1090, -610, 2440]);

return p.model();
