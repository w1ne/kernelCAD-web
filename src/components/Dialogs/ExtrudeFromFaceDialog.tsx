import { BaseFormDialog, type FormValues } from '../Forms';
import { extrudeFromFaceSchema } from '../Forms/schemas';

interface ExtrudeFromFaceDialogProps {
    onConfirm: (distance: number, direction: 'normal' | 'reversed') => void;
    onCancel: () => void;
}

export function ExtrudeFromFaceDialog({ onConfirm, onCancel }: ExtrudeFromFaceDialogProps) {
    const handleConfirm = (values: FormValues) => {
        onConfirm(
            values.distance as number,
            values.direction as 'normal' | 'reversed'
        );
    };

    return (
        <BaseFormDialog
            schema={extrudeFromFaceSchema}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText="Extrude"
        />
    );
}
