import { useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateFilletCode } from '../../features/core/modifiers.feature';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { BaseFormPanel, type FormValues } from '../Forms';
import { filletFormSchema } from '../Forms/schemas';

export function FilletPanel() {
    const { setPreviewCode, codeContext } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();

    const handleConfirm = (values: FormValues) => {
        const codeSnippet = generateFilletCode(
            codeContext,
            values.targetName as string,
            values.radius as number,
            values.filterType as string
        );
        insertCode(codeSnippet);
        closePanel('fillet');
    };

    const handleChange = (values: FormValues) => {
        if (!values.targetName) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateFilletCode(
            codeContext,
            values.targetName as string,
            values.radius as number,
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
            schema={filletFormSchema}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('fillet')}
            onChange={handleChange}
            submitLabel="Fillet"
        />
    );
}
