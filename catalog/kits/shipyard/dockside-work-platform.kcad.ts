// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "dockside-work-platform",
  license: "CC0-1.0",
  title: "Dockside work platform",
  description: "Raised quay-side work deck with four legs, perimeter rails, a toe board, and a short access step. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#667e79", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("dockside-work-platform");

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

B("deck", [2200, 1350, 150], [0, 0, 1190]);
B("support-leg-0", [120, 120, 1120], [-950, -520, 560]);
B("support-leg-1", [120, 120, 1120], [950, -520, 560]);
B("support-leg-2", [120, 120, 1120], [-950, 520, 560]);
B("support-leg-3", [120, 120, 1120], [950, 520, 560]);
B("rail-post-0", [75, 75, 650], [-950, -520, 1510]);
B("rail-post-1", [75, 75, 650], [0, -520, 1510]);
B("rail-post-2", [75, 75, 650], [950, -520, 1510]);
B("rail-post-3", [75, 75, 650], [-950, 520, 1510]);
B("rail-post-4", [75, 75, 650], [0, 520, 1510]);
B("rail-post-5", [75, 75, 650], [950, 520, 1510]);
B("guardrail-0", [920, 65, 75], [-475, -520, 1780]);
B("guardrail-1", [920, 65, 75], [475, -520, 1780]);
B("guardrail-2", [920, 65, 75], [-475, 520, 1780]);
B("guardrail-3", [920, 65, 75], [475, 520, 1780]);
B("toe-board", [2200, 60, 140], [0, -650, 1335]);
B("access-step", [740, 420, 130], [0, -820, 65]);

return p.model();
