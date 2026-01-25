import type { DialogField } from "./ParameterDialog";

export type DialogType = 'BOX' | 'CYLINDER' | 'SPHERE' | null;

// ... imports

export const GEOMETRY_CONFIGS: Record<string, { title: string; fields: DialogField[]; template: (v: Record<string, number>, name: string) => string; baseName: string }> = {
    BOX: {
        title: 'Create Box',
        baseName: 'box',
        fields: [
            { label: 'Width (X)', key: 'width', defaultValue: 30 },
            { label: 'Length (Y)', key: 'length', defaultValue: 30 },
            { label: 'Height (Z)', key: 'height', defaultValue: 30 },
        ],
        template: (v, name) => `const ${name} = replicad.makeBox(${v.width}, ${v.length}, ${v.height});`
    },
    CYLINDER: {
        title: 'Create Cylinder',
        baseName: 'cyl',
        fields: [
            { label: 'Radius', key: 'radius', defaultValue: 15 },
            { label: 'Height', key: 'height', defaultValue: 40 },
        ],
        template: (v, name) => `const ${name} = replicad.makeCylinder(${v.radius}, ${v.height});`
    },

    SPHERE: { // Future proofing
        title: 'Create Sphere',
        baseName: 'sphere',
        fields: [
            { label: 'Radius', key: 'radius', defaultValue: 20 },
        ],
        template: (v, name) => `const ${name} = replicad.makeSphere(${v.radius});`
    }
};
