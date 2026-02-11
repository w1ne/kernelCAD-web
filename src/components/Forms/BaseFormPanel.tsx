import { useState } from 'react';
import { FormField } from './FormField';
import type { FormSchema, FormValues } from './FormSchema';
import { validateFormValues, getDefaultValues } from './FormSchema';

interface BaseFormPanelProps {
    schema: FormSchema;
    initialValues?: FormValues;
    onConfirm: (values: FormValues) => void;
    onCancel: () => void;
    onChange?: (values: FormValues) => void; // For live preview
    activeField?: string;
    onFieldActivate?: (fieldName: string) => void;
}

export function BaseFormPanel({
    schema,
    initialValues,
    onConfirm,
    onCancel,
    onChange,
    activeField,
    onFieldActivate
}: BaseFormPanelProps) {
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
        setValues(prev => {
            const newValues = { ...prev, [fieldName]: value };
            // Call onChange callback for live preview
            if (onChange) {
                onChange(newValues);
            }
            return newValues;
        });
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
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4 shadow-xl w-full">
            <h3 className="text-lg font-semibold text-white mb-3">
                {schema.title}
            </h3>

            {schema.description && (
                <p className="text-xs text-gray-400 mb-3">{schema.description}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                {schema.fields.map((field) => (
                    <FormField
                        key={field.name}
                        field={field}
                        value={values[field.name]}
                        error={errors[field.name]}
                        onChange={(value) => handleFieldChange(field.name, value)}
                        active={activeField === field.name}
                        onActivate={() => onFieldActivate?.(field.name)}
                    />
                ))}

                <div className="flex gap-2 justify-end pt-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                        Apply
                    </button>
                </div>
            </form>
        </div>
    );
}
