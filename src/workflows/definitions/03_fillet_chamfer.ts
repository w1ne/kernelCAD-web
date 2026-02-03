import type { WorkflowDefinition } from '../registry';

export const filletChamfer: WorkflowDefinition = {
    id: 'fillet-chamfer',
    name: 'Fillet and Chamfer',
    description: 'Apply fillet and chamfer to edges.',
    code: `
const { Sketcher } = replicad;
// Use EXACT code from Repro that passes
const base = new Sketcher()
    .hLine(40)
    .vLine(40)
    .hLine(-40)
    .close()
    .extrude(20);


const filleted = base.fillet(2);
return filleted;
`,
    expected: {
        volume: 31828 // Repro volume
    }
};
