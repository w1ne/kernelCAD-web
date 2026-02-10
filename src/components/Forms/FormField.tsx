import type { FormField as FormFieldSchema } from './FormSchema';
import { SketchSelector } from './SketchSelector';

interface FormFieldProps {
    field: FormFieldSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (value: any) => void;
}

export function FormField({ field, value, error, onChange }: FormFieldProps) {
    const baseInputClasses = "w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500";
    const errorClasses = error ? "border-red-500" : "";
    const fieldId = `field-${field.name}`;

    const renderInput = () => {
        switch (field.type) {
            case 'number':
                return (
                    <input
                        id={fieldId}
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className={`${baseInputClasses} ${errorClasses}`}
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        placeholder={field.placeholder}
                        required={field.required}
                    />
                );

            case 'text':
                return (
                    <input
                        id={fieldId}
                        type="text"
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={`${baseInputClasses} ${errorClasses}`}
                        placeholder={field.placeholder}
                        required={field.required}
                    />
                );

            case 'select':
                return (
                    <select
                        id={fieldId}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        className={`${baseInputClasses} ${errorClasses}`}
                        required={field.required}
                    >
                        {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'sketch-selector':
                return (
                    <SketchSelector
                        value={value as string}
                        onChange={onChange}
                        label={field.label}
                        required={field.required}
                    />
                );

            case 'checkbox':
                return (
                    <input
                        id={fieldId}
                        type="checkbox"
                        checked={value ?? false}
                        onChange={(e) => onChange(e.target.checked)}
                        className="w-4 h-4 bg-[#2a2a2a] border border-[#444] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-300">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput()}
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </div>
    );
}
