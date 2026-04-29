import { Layers } from 'lucide-react';
import { type Feature } from '../features/types';
import { useWorkbench } from '../context/WorkbenchContext';
import { formatTooltip } from '../constants/shortcuts';

interface ToolbarProps {
    features: Feature[];
    onToolClick: (feature: Feature) => void;
}

/**
 * v0.1 web demo toolbar.
 *
 * Per the v0.1 NORTHSTAR spec, kernelCAD is script-as-source-of-truth and
 * Studio UI commands are deferred to v0.5. The legacy 0.10.0 creation /
 * construction / modification buttons (Box, Cylinder, Sketch, Extrude,
 * Revolve, Fillet, Chamfer, Cut, Union, Intersect, Sketch Visibility) all
 * generated AST mutations against a `drawPart()` envelope that the v0.1
 * script-runtime no longer recognizes. Until v0.5 designs the new GUI, the
 * deployed app only shows the Toggle Scene Browser button so users can still
 * inspect the auto-derived feature tree from their script.
 *
 * The legacy command-driven toolbar code stays in git history (and the
 * feature registry / `onToolClick` prop are still accepted for
 * compatibility) so v0.5 can revive whichever pieces it wants.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Toolbar({ features: _features, onToolClick: _onToolClick }: ToolbarProps) {
    const {
        toggleSidePanel,
        sidePanelVisible,
    } = useWorkbench();

    return (
        <div className="flex flex-col gap-2 p-2 bg-[#111] border-r border-[#333] w-14 items-center">
            {/* Side Panel Toggle */}
            <button
                onClick={toggleSidePanel}
                className={`p-2 rounded hover:bg-[#333] transition-colors ${sidePanelVisible ? 'text-blue-400' : 'text-gray-500'}`}
                aria-label="Toggle Scene Browser"
                title={formatTooltip(sidePanelVisible ? "Hide Scene Browser" : "Show Scene Browser", undefined)}
            >
                <Layers size={20} />
            </button>
        </div>
    );
}
