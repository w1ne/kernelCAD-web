import type { FormField as FormFieldSchema } from './FormSchema';
import { SketchSelector } from './SketchSelector';
import { SelectionSlot } from './SelectionSlot';

interface FormFieldProps {
    field: FormFieldSchema;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (value: any) => void;
    active?: boolean;
    onActivate?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Slider = ({ field, value, onChange }: { field: FormFieldSchema, value: any, onChange: (v: any) => void }) => (
    <div className="flex flex-col gap-1 w-full mt-1">
        <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-300 font-mono">
                {(value as number) ?? field.defaultValue ?? 0}
                {field.name.includes('angle') ? '°' : ''}
            </span>
        </div>
        <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={value ?? field.defaultValue ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-selection-blue h-1 rounded-full bg-white/10 appearance-none cursor-grab active:cursor-grabbing"
        />
    </div>
);

export function FormField({ field, value, error, onChange, active, onActivate }: FormFieldProps) {
    const baseInputClasses = "w-full bg-[#2a2a2a] border border-[#444] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500";
    const errorClasses = error ? "border-red-500" : "";
    const generatedFieldId = `field-${field.name}`;
    const fieldId = field.id ?? generatedFieldId;

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
                        id={fieldId}
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

            case 'slider':
                return (
                    <Slider field={field} value={value} onChange={onChange} />
                );

            case 'selection-slot':
                return (
                    <SelectionSlot
                        value={value}
                        onChange={onChange}
                        label={''} // Label is handled by FormField container
                        placeholder={field.placeholder}
                        required={field.required}
                        active={active}
                        onActivate={onActivate}
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
