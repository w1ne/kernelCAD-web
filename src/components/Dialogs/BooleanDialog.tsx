import { BaseFormDialog, type FormValues } from '../Forms';
import { createBooleanSchema } from '../Forms/schemas';

interface BooleanDialogProps {
    type: 'fuse' | 'cut' | 'intersect';
    onConfirm: (params: { baseName: string; toolName: string; type: 'fuse' | 'cut' | 'intersect' }) => void;
    onCancel: () => void;
}

export function BooleanDialog({ type, onConfirm, onCancel }: BooleanDialogProps) {
    const schema = createBooleanSchema(type);
    const actionLabel = type === 'fuse' ? 'Join' : type === 'cut' ? 'Cut' : 'Intersect';

    const handleConfirm = (values: FormValues) => {
        onConfirm({
            baseName: values.baseName as string,
            toolName: values.toolName as string,
            type,
        });
    };

    return (
        <BaseFormDialog
            schema={schema}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText={actionLabel}
        />
    );
}
