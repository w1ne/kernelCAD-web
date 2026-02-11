import { useSketchOptions } from '../../hooks/useSketchOptions';
import { BaseFormDialog } from '../Forms/BaseFormDialog';
import type { FormSchema, FormValues } from '../Forms/FormSchema';

interface RevolveDialogProps {
    sketchName?: string;
    onConfirm: (params: { sketchName: string; angle: number; axis: string }) => void;
    onCancel: () => void;
}

const revolveSchema: FormSchema = {
    title: 'Revolve',
    fields: [
        {
            name: 'sketchName',
            type: 'sketch-selector',
            label: 'Select Sketch Profile',
            required: true
        },
        {
            name: 'angle',
            type: 'number',
            label: 'Angle (degrees)',
            defaultValue: 360,
            min: 1,
            max: 360,
            step: 1
        },
        {
            name: 'axis',
            type: 'select',
            label: 'Rotation Axis (local)',
            defaultValue: 'X',
            options: [
                { value: 'X', label: 'X Axis' },
                { value: 'Y', label: 'Y Axis' },
                { value: 'Z', label: 'Z Axis' }
            ]
        }
    ]
};

export function RevolveDialog({ sketchName: initialSketchName, onConfirm, onCancel }: RevolveDialogProps) {
    const sketchOptions = useSketchOptions();

    // Auto-select last sketch if no initial sketch provided
    const defaultSketchName = initialSketchName ||
        (sketchOptions.length > 0 ? sketchOptions[sketchOptions.length - 1].value : '');

    const handleConfirm = (values: FormValues) => {
        onConfirm({
            sketchName: values.sketchName as string,
            angle: values.angle as number,
            axis: values.axis as string
        });
    };

    return (
        <BaseFormDialog
            schema={revolveSchema}
            initialValues={{
                sketchName: defaultSketchName,
                angle: 360,
                axis: 'X'
            }}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText="Revolve"
        />
    );
}
