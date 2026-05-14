import React from 'react';
import { useShellStore } from './store/useShellStore';
import { ValidityDeltaHeader } from './ValidityDeltaHeader';
import { DiagnosticRow } from './DiagnosticRow';

/**
 * Bottom drawer. Open-state is derived from `currentValidity.status`:
 * any non-solved status with a non-null result opens it. Closed when
 * validity is null or status === 'solved'.
 */
export const BottomDrawer: React.FC = () => {
    const { currentValidity, previousValidity } = useShellStore();

    const isOpen = currentValidity != null && currentValidity.status !== 'solved';
    if (!isOpen || !currentValidity) return null;

    return (
        <section
            aria-label="Validity drawer"
            data-open="true"
            className="flex-shrink-0 bg-[#181818] border-t border-[#2d2d2d] text-gray-200 flex flex-col"
            style={{ height: '25vh' }}
        >
            <ValidityDeltaHeader prev={previousValidity} curr={currentValidity} />
            <div className="flex-1 min-h-0 overflow-y-auto">
                {currentValidity.diagnostics.map((d, i) => (
                    <DiagnosticRow key={`${d.code}-${i}`} diagnostic={d} />
                ))}
            </div>
        </section>
    );
};

export default BottomDrawer;
