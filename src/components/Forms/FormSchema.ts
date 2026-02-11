/**
 * Form Schema System
 * 
 * Declarative schema for defining form fields that can be rendered
 * in both Dialog and Panel contexts.
 */

export type FormFieldType = 'number' | 'select' | 'checkbox' | 'text' | 'sketch-selector' | 'slider' | 'selection-slot';

export interface SelectOption {
    value: string;
    label: string;
}

export interface FormField {
    name: string;
    label: string;
    type: FormFieldType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValue?: any;
    min?: number;
    max?: number;
    step?: number;
    options?: SelectOption[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validation?: (value: any) => string | null;
    placeholder?: string;
    required?: boolean;
}

export interface FormSchema {
    title: string;
    description?: string;
    fields: FormField[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormValues = Record<string, any>;

/**
 * Validate form values against schema
 */
export function validateFormValues(values: FormValues, schema: FormSchema): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const field of schema.fields) {
        const value = values[field.name];

        // Required field validation
        if (field.required && (value === undefined || value === null || value === '')) {
            errors[field.name] = `${field.label} is required`;
            continue;
        }

        // Custom validation
        if (field.validation && value !== undefined && value !== null) {
            const error = field.validation(value);
            if (error) {
                errors[field.name] = error;
            }
        }

        // Type-specific validation
        if (field.type === 'number' && value !== undefined && value !== null) {
            if (typeof value !== 'number' || isNaN(value)) {
                errors[field.name] = `${field.label} must be a number`;
            } else {
                if (field.min !== undefined && value < field.min) {
                    errors[field.name] = `${field.label} must be at least ${field.min}`;
                }
                if (field.max !== undefined && value > field.max) {
                    errors[field.name] = `${field.label} must be at most ${field.max}`;
                }
            }
        }
    }

    return errors;
}

/**
 * Get default values from schema
 */
export function getDefaultValues(schema: FormSchema): FormValues {
    const values: FormValues = {};

    for (const field of schema.fields) {
        if (field.defaultValue !== undefined) {
            values[field.name] = field.defaultValue;
        } else {
            // Set sensible defaults based on type
            switch (field.type) {
                case 'number':
                    values[field.name] = field.min ?? 0;
                    break;
                case 'checkbox':
                    values[field.name] = false;
                    break;
                case 'text':
                    values[field.name] = '';
                    break;
                case 'select':
                    values[field.name] = field.options?.[0]?.value ?? '';
                    break;
            }
        }
    }

    return values;
}
