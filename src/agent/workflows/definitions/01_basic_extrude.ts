import type { WorkflowDefinition } from '../registry';

export const basicExtrude: WorkflowDefinition = {
    id: 'basic-extrude',
    name: 'Basic Extrude',
    description: 'Creates a rectangle and extrudes it.',
    code: `
const { Sketcher } = replicad;
const sketch = new Sketcher()
    .hLine(20)
    .vLine(10)
    .hLine(-20)
    .close();

return extrude(sketch, 50);
`,
    expected: {
        volume: 20 * 10 * 50,
        faceCount: 6,
        edgeCount: 12,
        sketchCount: 1
    }
};
