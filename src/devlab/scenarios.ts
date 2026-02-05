export type DevLabScenario = {
  id: string;
  name: string;
  code: string;
};

export const devLabScenarios: DevLabScenario[] = [
  {
    id: 'sketch-select-extrude',
    name: 'Sketch select → Extrude',
    code: `
const sketch = new Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10)
  .hLine(-10)
  .close();

return replicad.makeBox(10, 10, 10);
    `.trim(),
  },
  {
    id: 'anonymous-shape-extrude-face',
    name: 'Anonymous shape → Extrude face',
    code: `
return replicad.makeBox(10, 10, 10);
    `.trim(),
  },
  {
    id: 'two-shapes-face-select',
    name: 'Two shapes (face selection)',
    code: `
const a = replicad.makeBox(10, 10, 10);
const b = replicad.makeCylinder(5, 20).translate(15, 0, 0);
return [a, b];
    `.trim(),
  },
];

