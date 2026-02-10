import { useSketchOptions } from '../../hooks/useSketchOptions';
import { BaseFormDialog } from '../Forms/BaseFormDialog';
import type { FormSchema, FormValues } from '../Forms/FormSchema';

interface ExtrudeDialogProps {
    sketchName?: string;
    onConfirm: (params: { sketchName: string; distance: number; direction: 'normal' | 'reversed' }) => void;
    onCancel: () => void;
}

const extrudeSchema: FormSchema = {
    title: 'Extrude',
    fields: [
        {
            name: 'sketchName',
            type: 'sketch-selector',
            label: 'Select Sketch',
            required: true
        },
        {
            name: 'distance',
            type: 'number',
            label: 'Distance (mm)',
            defaultValue: 10,
            min: 1,
            step: 1
        },
        {
            name: 'direction',
            type: 'select',
            label: 'Direction',
            defaultValue: 'normal',
            options: [
                { value: 'normal', label: 'Normal (upward)' },
                { value: 'reversed', label: 'Reversed (downward)' }
            ]
        }
    ]
};

export function ExtrudeDialog({ sketchName: initialSketchName, onConfirm, onCancel }: ExtrudeDialogProps) {
    const sketchOptions = useSketchOptions();

    // Auto-select last sketch if no initial sketch provided
    const defaultSketchName = initialSketchName ||
        (sketchOptions.length > 0 ? sketchOptions[sketchOptions.length - 1].value : '');

    const handleConfirm = (values: FormValues) => {
        onConfirm({
            sketchName: values.sketchName as string,
            distance: values.distance as number,
            direction: values.direction as 'normal' | 'reversed'
        });
    };

    return (
        <BaseFormDialog
            schema={extrudeSchema}
            initialValues={{
                sketchName: defaultSketchName,
                distance: 10,
                direction: 'normal'
            }}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText="Extrude"
        />
    );
}
