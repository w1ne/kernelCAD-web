import type { WorkflowDefinition } from '../registry';

export const sketchOnFace: WorkflowDefinition = {
    id: 'sketch-on-face-basic',
    name: 'Sketch On Face (Basic)',
    description: 'Sketch on a planar face of a box.',
    code: `
const { Sketcher } = replicad;
// const box = replicad.makeBox(50, 50, 50);
const box = new Sketcher().hLine(50).vLine(50).hLine(-50).close().extrude(50);

// Sketch on face 5 (Top)
const sketch = sketchOnFace(box, 5)
    .circle(10);

const boss = extrude(sketch, 10);
return box.fuse(boss);
`,
    expected: {
        sketchCount: 2, // 1 box sketch + 1 face sketch
        // Box + Cylinder
        volume: 125000 + (Math.PI * 100 * 10)
    }
};
