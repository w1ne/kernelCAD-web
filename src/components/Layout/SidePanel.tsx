import SceneBrowser from '../SceneBrowser';
import { useWorkbench } from '../../context/WorkbenchContext';
import { extractVariables, type VariableDefinition } from '../../lib/codeAnalysis';

// We need an external way to notify the Editor to jump to a line.
// Since the editor is in a sibling component, we can use an EventBus or share 'jumpRequest' in Context.
// For now, let's add `jumpToLine` to Reference in Context?
// Or we can keep `editorInstance` in Context.
// Refactoring: Let's assume we pass the onSelect handler down from a parent or use context if extended.
// But wait, SidePanel needs to select things.
// Let's modify WorkbenchContext to expose `editorActions` or similar? 
// Actually, putting `editor` instance in context is risky due to serialization/mutability but fine for this scale.

interface SidePanelProps {
    onJumpToLine: (line: number) => void;
}

export function SidePanel({ onJumpToLine }: SidePanelProps) {
    const { code, setViewMode, planes, togglePlaneVisibility } = useWorkbench();

    // We compute items on the fly. 
    // In a real app we might memoize this or put it in context.
    const items = extractVariables(code);

    return (
        <div className="flex-1 overflow-hidden bg-[#111] border-b border-[#333]">
            <SceneBrowser
                items={items}
                planes={planes}
                onSelect={(item: VariableDefinition) => {
                    setViewMode('code');
                    onJumpToLine(item.line);
                }}
                onTogglePlane={togglePlaneVisibility}
            />
        </div>
    );
}
