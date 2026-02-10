import { BaseFormDialog, type FormValues } from '../Forms';
import { filletFormSchema } from '../Forms/schemas';

interface FilletDialogProps {
    onConfirm: (params: { targetName: string; radius: number; filterType: string }) => void;
    onCancel: () => void;
}

export function FilletDialog({ onConfirm, onCancel }: FilletDialogProps) {
    const handleConfirm = (values: FormValues) => {
        onConfirm({
            targetName: values.targetName as string,
            radius: values.radius as number,
            filterType: values.filterType as string,
        });
    };

    return (
        <BaseFormDialog
            schema={filletFormSchema}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText="Apply Fillet"
        />
    );
}
