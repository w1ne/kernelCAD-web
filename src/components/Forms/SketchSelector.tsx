import { useSketchOptions } from '../../hooks/useSketchOptions';

interface SketchSelectorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    required?: boolean;
    className?: string;
    id?: string;
}

/**
 * Reusable sketch selector component
 * Displays both UI-created sketches and code-based sketches
 */
export function SketchSelector({
    value,
    onChange,
    label = 'Profile',
    required = false,
    className = '',
    id
}: SketchSelectorProps) {
    const options = useSketchOptions();

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label htmlFor={id} className="text-xs font-medium text-zinc-400">{label}</label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                required={required}
            >
                <option value="" disabled>
                    Select Sketch...
                </option>
                {options.map((s) => (
                    <option key={s.key} value={s.value}>
                        {s.label}
                    </option>
                ))}
            </select>
            {options.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No sketches available.</p>
            )}
        </div>
    );
}
