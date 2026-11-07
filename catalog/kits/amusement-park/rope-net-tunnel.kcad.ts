// Rope net tunnel: Short crawl-through play tunnel with six arch frames, cross braces, and a low net-grid silhouette.
meta({
  name: "rope-net-tunnel",
  license: "CC0-1.0",
  title: "Rope net tunnel",
  description: "Short crawl-through play tunnel with six arch frames, cross braces, and a low net-grid silhouette. Controls: overall scale, steel, nylon, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#738087", { label: "Painted steel" });
const nylon = param("nylon", "#a98b58", { label: "Nylon" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "steel": "#9da3a0",
    "nylon": "#d3a84f",
    "rubber": "#3c4245"
},
  twilight: {
    "steel": "#4f626c",
    "nylon": "#627e8d",
    "rubber": "#20262a"
},
});
const originOffsetMm = 0;
const p = assembly("rope-net-tunnel");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["arch-rib-0", "arch-rib-1", "arch-rib-2", "arch-rib-3", "arch-rib-4", "arch-rib-5", "net-strand-0", "net-strand-1", "net-strand-2", "net-strand-3", "net-strand-4", "net-strand-5", "net-strand-6"].includes(name)) p.part(name, positioned.color(steel));
  else if (["cross-brace-2"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["arch-foot-0", "arch-foot-1", "arch-foot-2", "arch-foot-3", "cross-brace-0", "cross-brace-1"].includes(name)) p.part(name, positioned.color(nylon));
  else p.part(name, positioned.color(steel));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("arch-foot-0", [180, 180, 90], [-1100, -600, 45]);
B("arch-foot-1", [180, 180, 90], [1100, -600, 45]);
B("arch-foot-2", [180, 180, 90], [-1100, 600, 45]);
B("arch-foot-3", [180, 180, 90], [1100, 600, 45]);
B("arch-rib-0", [80, 95, 1500], [-1050, -590, 760], [-24, 0, 0]);
B("arch-rib-1", [80, 95, 1500], [-1050, 590, 760], [24, 0, 0]);
B("arch-rib-2", [80, 95, 1500], [0, -590, 760], [-24, 0, 0]);
B("arch-rib-3", [80, 95, 1500], [0, 590, 760], [24, 0, 0]);
B("arch-rib-4", [80, 95, 1500], [1050, -590, 760], [-24, 0, 0]);
B("arch-rib-5", [80, 95, 1500], [1050, 590, 760], [24, 0, 0]);
B("net-strand-0", [70, 1200, 70], [-900, 0, 900]);
B("net-strand-1", [70, 1200, 70], [-600, 0, 1220]);
B("net-strand-2", [70, 1200, 70], [-300, 0, 1400]);
B("net-strand-3", [70, 1200, 70], [0, 0, 1480]);
B("net-strand-4", [70, 1200, 70], [300, 0, 1400]);
B("net-strand-5", [70, 1200, 70], [600, 0, 1220]);
B("net-strand-6", [70, 1200, 70], [900, 0, 900]);
B("cross-brace-0", [2150, 70, 70], [0, -480, 760]);
B("cross-brace-1", [2150, 70, 70], [0, 0, 760]);
B("cross-brace-2", [2150, 70, 70], [0, 480, 760]);

return p.model();
