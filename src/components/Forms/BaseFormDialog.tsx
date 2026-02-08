import { useState } from 'react';
import { FormField } from './FormField';
import type { FormSchema, FormValues } from './FormSchema';
import { validateFormValues, getDefaultValues } from './FormSchema';

interface BaseFormDialogProps {
    schema: FormSchema;
    initialValues?: FormValues;
    onConfirm: (values: FormValues) => void;
    onCancel: () => void;
    confirmButtonText?: string;
}

export function BaseFormDialog({ schema, initialValues, onConfirm, onCancel, confirmButtonText = 'Confirm' }: BaseFormDialogProps) {
    const [values, setValues] = useState<FormValues>(() => ({
        ...getDefaultValues(schema),
        ...initialValues,
    }));
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validateFormValues(values, schema);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        onConfirm(values);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFieldChange = (fieldName: string, value: any) => {
        setValues(prev => ({ ...prev, [fieldName]: value }));
        // Clear error for this field when user changes it
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl min-w-[400px] max-w-[600px]">
                <h2 className="text-xl font-bold text-white mb-4">
                    {schema.title}
                </h2>

                {schema.description && (
                    <p className="text-sm text-gray-400 mb-4">{schema.description}</p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {schema.fields.map((field) => (
                        <FormField
                            key={field.name}
                            field={field}
                            value={values[field.name]}
                            error={errors[field.name]}
                            onChange={(value) => handleFieldChange(field.name, value)}
                        />
                    ))}

                    <div className="flex gap-2 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                            {confirmButtonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
