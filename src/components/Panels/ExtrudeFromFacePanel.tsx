import { useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateExtrudeFromFaceCode, ExtrudeFromFaceFeature } from '../../features/core/extrudeFromFace.feature';
import { BaseFormPanel, type FormValues } from '../Forms';
import { extrudeFromFaceSchema } from '../Forms/schemas';

export function ExtrudeFromFacePanel() {
    const {
        setPreviewCode,
        codeContext,
        selectedFace,
        insertCode,
        mutateCode,
        code,
        setActiveDialog,
        openPanel
    } = useWorkbench();
    const { closePanel } = useUI();

    const handleConfirm = (values: FormValues) => {
        if (!selectedFace) return;

        const distance = values.distance as number;
        const direction = values.direction as 'normal' | 'reversed';
        const finalDistance = direction === 'reversed' ? -distance : distance;

        ExtrudeFromFaceFeature.execute(
            {
                insertCode,
                mutateCode,
                setActiveDialog,
                openPanel,
                closePanel,
                code,
                codeContext
            },
            {
                distance: finalDistance,
                faceId: selectedFace.faceId,
                shapeIndex: selectedFace.shapeIndex
            }
        );
    };

    const handleChange = (values: FormValues) => {
        if (!selectedFace) {
            setPreviewCode(null);
            return;
        }

        const distance = values.distance as number;
        const direction = values.direction as 'normal' | 'reversed';
        const finalDistance = direction === 'reversed' ? -distance : distance;

        const targetName = codeContext.getVariableAtIndex(selectedFace.shapeIndex);
        const previewCode = generateExtrudeFromFaceCode(
            codeContext,
            targetName,
            selectedFace.faceId,
            finalDistance
        );
        setPreviewCode(previewCode);
    };

    // Clear preview on unmount
    useEffect(() => {
        return () => setPreviewCode(null);
    }, [setPreviewCode]);

    return (
        <>
            <div className="text-[11px] text-zinc-400 bg-black/20 p-2 rounded border border-white/5 mx-1 mb-2">
                Extruding face {selectedFace?.faceId} of <span className="text-selection-blue font-medium">{codeContext.getVariableAtIndex(selectedFace?.shapeIndex ?? -1) || 'Anonymous'}</span>
            </div>
            <BaseFormPanel
                schema={extrudeFromFaceSchema}
                onConfirm={handleConfirm}
                onCancel={() => closePanel('extrudeFromFace')}
                onChange={handleChange}
                submitLabel="Extrude"
            />
        </>
    );
}
