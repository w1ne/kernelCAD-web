import { useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateChamferCode } from '../../features/core/modifiers.feature';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { BaseFormPanel, type FormValues } from '../Forms';
import { chamferFormSchema } from '../Forms/schemas';

export function ChamferPanel() {
    const { setPreviewCode, codeContext } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();

    const handleConfirm = (values: FormValues) => {
        const codeSnippet = generateChamferCode(
            codeContext,
            values.targetName as string,
            values.distance as number,
            values.filterType as string
        );
        insertCode(codeSnippet);
        closePanel('chamfer');
    };

    const handleChange = (values: FormValues) => {
        if (!values.targetName) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateChamferCode(
            codeContext,
            values.targetName as string,
            values.distance as number,
            values.filterType as string
        );
        setPreviewCode(previewCode);
    };

    // Clear preview on unmount
    useEffect(() => {
        return () => setPreviewCode(null);
    }, [setPreviewCode]);

    return (
        <BaseFormPanel
            schema={chamferFormSchema}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('chamfer')}
            onChange={handleChange}
            submitLabel="Chamfer"
        />
    );
}
