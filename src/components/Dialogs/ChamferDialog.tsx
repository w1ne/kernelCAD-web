import { BaseFormDialog, type FormValues } from '../Forms';
import { chamferFormSchema } from '../Forms/schemas';

interface ChamferDialogProps {
    onConfirm: (params: { targetName: string; distance: number; filterType: string }) => void;
    onCancel: () => void;
}

export function ChamferDialog({ onConfirm, onCancel }: ChamferDialogProps) {
    const handleConfirm = (values: FormValues) => {
        onConfirm({
            targetName: values.targetName as string,
            distance: values.distance as number,
            filterType: values.filterType as string,
        });
    };

    return (
        <BaseFormDialog
            schema={chamferFormSchema}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText="Apply Chamfer"
        />
    );
}
