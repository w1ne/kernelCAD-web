import type { WorkflowDefinition } from '../registry';

export const debugApi: WorkflowDefinition = {
    id: 'debug-api',
    name: 'Debug API Check',
    description: 'Inspects Sketcher prototype and keys',
    code: `
const { Sketcher } = replicad;
console.log("Debug: Sketcher prototype keys:", Object.getOwnPropertyNames(Sketcher.prototype));

const s = new Sketcher();
console.log("Debug: Sketcher instance keys:", Object.keys(s));
console.log("Debug: Sketcher instance proto keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(s)));
console.log("Debug: Is circle a function?", typeof s.circle);

return s.close().extrude(10);
`,
    expected: {
        error: /No lines to convert into a wire/
    }
};
