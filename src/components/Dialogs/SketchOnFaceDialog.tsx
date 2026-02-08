import { BaseFormDialog, type FormValues } from '../Forms';
import { createSketchOnFaceSchema } from '../Forms/schemas';

interface SketchOnFaceDialogProps {
    defaultName: string;
    faceId: number;
    shapeName: string;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export function SketchOnFaceDialog({ defaultName, faceId, shapeName, onConfirm, onCancel }: SketchOnFaceDialogProps) {
    const schema = createSketchOnFaceSchema(shapeName, faceId);

    const handleConfirm = (values: FormValues) => {
        onConfirm(values.name as string);
    };

    return (
        <BaseFormDialog
            schema={schema}
            initialValues={{ name: defaultName }}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            confirmButtonText="Create Sketch"
        />
    );
}
