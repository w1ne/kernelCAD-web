import { useEffect, useMemo } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateBooleanCode } from '../../features/core/modifiers.feature';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { BaseFormPanel, type FormValues } from '../Forms';
import { createBooleanSchema } from '../Forms/schemas';

interface BooleanPanelProps {
    type: 'fuse' | 'cut' | 'intersect';
}

export function BooleanPanel({ type }: BooleanPanelProps) {
    const { codeContext, setPreviewCode } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();

    const schema = useMemo(() => createBooleanSchema(type), [type]);
    const panelId = type === 'fuse' ? 'union' : type;

    const handleConfirm = (values: FormValues) => {
        const codeSnippet = generateBooleanCode(
            codeContext,
            values.baseName as string,
            values.toolName as string,
            type
        );
        insertCode(codeSnippet);
        closePanel(panelId);
    };

    const handleChange = (values: FormValues) => {
        if (!values.baseName || !values.toolName) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateBooleanCode(
            codeContext,
            values.baseName as string,
            values.toolName as string,
            type
        );
        setPreviewCode(previewCode);
    };

    // Clear preview on unmount
    useEffect(() => {
        return () => setPreviewCode(null);
    }, [setPreviewCode]);

    return (
        <BaseFormPanel
            schema={schema}
            onConfirm={handleConfirm}
            onCancel={() => closePanel(panelId)}
            onChange={handleChange}
        />
    );
}
