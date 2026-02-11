

interface SelectionSlotProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (value: any) => void;
    placeholder?: string;
    required?: boolean;
    active?: boolean;
    onActivate?: () => void;
}

export function SelectionSlot({
    value,
    label,
    onChange,
    placeholder = "Click to select...",
    required,
    active,
    onActivate
}: SelectionSlotProps) {
    const hasValue = value !== null && value !== undefined;
    const displayName = hasValue ? (typeof value === 'object' ? value.name || 'Selection' : String(value)) : placeholder;

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div
                onClick={onActivate}
                className={`flex items-center gap-2 rounded border px-3 py-2 text-left transition-all cursor-pointer ${active
                    ? 'border-selection-blue bg-selection-blue/10 ring-1 ring-selection-blue/30'
                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                    }`}
            >
                <div className={`h-2 w-2 rounded-full ${hasValue ? 'bg-selection-blue' : 'bg-red-500/50'}`} />
                <span className={`text-sm flex-1 truncate ${hasValue ? 'text-zinc-200' : 'text-zinc-500 italic'}`}>
                    {displayName}
                </span>
                {hasValue && (
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                            if (onActivate) onActivate();
                        }}
                        className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
                    >
                        &times;
                    </span>
                )}
            </div>
        </div>
    );
}
