import type { FormSchema } from './FormSchema';

export const chamferFormSchema: FormSchema = {
    title: 'Chamfer Edges',
    fields: [
        {
            name: 'targetName',
            label: 'Target Variable Name',
            type: 'text',
            defaultValue: 'shape',
            placeholder: 'e.g. box1, shape',
            required: true,
        },
        {
            name: 'distance',
            label: 'Distance (mm)',
            type: 'number',
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            required: true,
            id: 'chamfer-distance',
        },
        {
            name: 'filterType',
            label: 'Edge Filter',
            type: 'select',
            defaultValue: 'all',
            options: [
                { value: 'all', label: 'All Edges' },
                { value: 'vertical', label: 'Vertical (Z)' },
                { value: 'horizontal', label: 'Horizontal (XY)' },
            ],
            required: true,
        },
    ],
};

export const filletFormSchema: FormSchema = {
    title: 'Fillet Edges',
    fields: [
        {
            name: 'targetName',
            label: 'Target Variable Name',
            type: 'text',
            defaultValue: 'shape',
            placeholder: 'e.g. box1, shape',
            required: true,
        },
        {
            name: 'radius',
            label: 'Radius (mm)',
            type: 'number',
            defaultValue: 1,
            min: 0.1,
            step: 0.1,
            required: true,
            id: 'fillet-radius',
        },
        {
            name: 'filterType',
            label: 'Edge Filter',
            type: 'select',
            defaultValue: 'all',
            options: [
                { value: 'all', label: 'All Edges' },
                { value: 'vertical', label: 'Vertical (Z)' },
                { value: 'horizontal', label: 'Horizontal (XY)' },
            ],
            required: true,
        },
    ],
};

export function createBooleanSchema(type: 'fuse' | 'cut' | 'intersect'): FormSchema {
    const title = type === 'fuse' ? 'Join (Union)' : type === 'cut' ? 'Cut (Subtract)' : 'Intersect';

    return {
        title,
        fields: [
            {
                name: 'baseName',
                label: 'Base Shape (Target)',
                type: 'text',
                defaultValue: 'shape1',
                placeholder: 'e.g. box1',
                required: true,
                id: 'base-name',
            },
            {
                name: 'toolName',
                label: 'Tool Shape (Modifier)',
                type: 'text',
                defaultValue: 'shape2',
                placeholder: 'e.g. cylinder1',
                required: true,
                id: 'tool-name',
            },
        ],
    };
}

export const extrudeFromFaceSchema: FormSchema = {
    title: 'Extrude Face',
    fields: [
        {
            name: 'distance',
            label: 'Distance',
            type: 'number',
            defaultValue: 20,
            required: true,
            id: 'extrude-distance',
        },
        {
            name: 'direction',
            label: 'Direction',
            type: 'select',
            defaultValue: 'normal',
            options: [
                { value: 'normal', label: 'Normal' },
                { value: 'reversed', label: 'Reversed' },
            ],
            required: true,
        },
    ],
};

export function createSketchOnFaceSchema(shapeName: string, faceId: number): FormSchema {
    return {
        title: 'New Sketch',
        description: `Creating sketch on ${shapeName} (Face ${faceId})`,
        fields: [
            {
                name: 'name',
                label: 'Sketch Name',
                type: 'text',
                defaultValue: `sketch_${shapeName}_f${faceId}`,
                required: true,
            },
        ],
    };
}
