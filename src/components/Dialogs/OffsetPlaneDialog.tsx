import { BaseFormDialog, type FormValues, type FormSchema } from '../Forms';
import { useWorkbench } from '../../context/WorkbenchContext';

interface OffsetPlaneDialogProps {
    onConfirm: (params: { basePlaneId: string; offset: number }) => void;
    onCancel: () => void;
}

export function OffsetPlaneDialog({ onConfirm, onCancel }: OffsetPlaneDialogProps) {
    const { planes, selectedFace } = useWorkbench();

    // Build dynamic options for plane selection
    const planeOptions = planes.map(p => ({
        value: p.id,
        label: `${p.name}${p.type === 'base' ? ' (Origin)' : ''}`
    }));

    // Add selected face option if available
    if (selectedFace) {
        planeOptions.push({
            value: `face-${selectedFace.faceId}`,
            label: `Selected Face ${selectedFace.faceId}`
        });
    }

    // Determine initial plane selection
    const initialPlaneId = selectedFace
        ? `face-${selectedFace.faceId}`
        : (planes.length > 0 ? planes[0].id : '');

    // Build schema with dynamic options
    const schema: FormSchema = {
        title: 'Construction Plane',
        fields: [
            {
                name: 'basePlaneId',
                label: 'Reference Entity',
                type: 'select',
                options: planeOptions,
                defaultValue: initialPlaneId,
                required: true,
            },
            {
                name: 'offset',
                label: 'Offset Distance (mm)',
                type: 'number',
                defaultValue: 0,
                step: 1,
            },
        ],
    };

    const handleConfirm = (values: FormValues) => {
        onConfirm({
            basePlaneId: values.basePlaneId as string,
            offset: values.offset as number,
        });
    };

    return (
        <BaseFormDialog
            schema={schema}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText="Create Plane"
        />
    );
}
