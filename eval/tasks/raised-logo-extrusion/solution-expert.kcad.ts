// eval/tasks/raised-logo-extrusion/solution-expert.kcad.ts
const base = extrudeRect(60, 60, 2);
const logo = sketch
  .text("KC", { size: 20, align: 'center', position: [30, 30], rotation: 15 })
  .extrude(1.5);
return base.union(logo.translate(0, 0, 2));
