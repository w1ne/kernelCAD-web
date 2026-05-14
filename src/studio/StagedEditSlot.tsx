import React from 'react';

export interface StagedEditSlotProps {
    readonly stagedEdits?: readonly never[];
    readonly onApprove?: () => void;
    readonly onReject?: () => void;
}

/**
 * Slice-1 placeholder for the staged-edit slot. The contract is shaped for
 * the Slice 1.5 backend (`stagedEdits`, `onApprove`, `onReject`), but v1
 * renders only the auto-apply notice + a disabled toggle.
 */
export const StagedEditSlot: React.FC<StagedEditSlotProps> = ({ stagedEdits }) => {
    const hasStaged = stagedEdits != null && stagedEdits.length > 0;

    return (
        <div className="p-3 flex flex-col gap-2">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">
                Staged edits
            </div>
            {hasStaged ? null : (
                <>
                    <p className="text-xs text-gray-300 leading-snug">
                        Auto-apply mode · toggle off to enable review
                    </p>
                    <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="self-start px-2 py-1 text-[11px] rounded border border-[#3a3a3a] bg-[#222] text-gray-500 cursor-not-allowed"
                    >
                        Review edits
                    </button>
                </>
            )}
        </div>
    );
};

export default StagedEditSlot;
