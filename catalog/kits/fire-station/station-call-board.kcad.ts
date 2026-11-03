// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-call-board",
  license: 'CC0-1.0',
  title: "Station call assignment board",
  description: "Wall board with unit-ready columns, crew cards and a magnetic incident strip." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "call", "assignment", "board"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7b8580", { label: 'Asset color' });
const p = assembly("station-call-board");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("backboard", [1600, 46, 940], [0, 0, 1580]);
b("top-title", [1600, 38, 130], [0, -40, 2070]);
b("column-0", [30, 20, 730], [-520, -40, 1570]);
b("column-1", [30, 20, 730], [-260, -40, 1570]);
b("column-2", [30, 20, 730], [0, -40, 1570]);
b("column-3", [30, 20, 730], [260, -40, 1570]);
b("column-4", [30, 20, 730], [520, -40, 1570]);
b("crew-card-0", [210, 20, 110], [-520, -68, 1740]);
b("crew-card-1", [210, 20, 110], [-260, -68, 1740]);
b("crew-card-2", [210, 20, 110], [0, -68, 1740]);
b("crew-card-3", [210, 20, 110], [260, -68, 1740]);
b("crew-card-4", [210, 20, 110], [520, -68, 1740]);
b("incident-strip", [1480, 28, 90], [0, -54, 1050]);

return p.model();
