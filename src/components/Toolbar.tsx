import { PenTool, ArrowUpFromLine, Eye, EyeOff, Layers } from 'lucide-react';
import { type Feature } from '../features/types';
import { useWorkbench } from '../context/WorkbenchContext';
import { FEATURE_SHORTCUTS, SHORTCUT_HINTS, formatTooltip } from '../constants/shortcuts';
import { buildFaceSketchPlaneEntity } from '../lib/sketchPlane';

interface ToolbarProps {
    features: Feature[];
    onToolClick: (feature: Feature) => void;
}

export default function Toolbar({ features, onToolClick }: ToolbarProps) {
    const {
        selectedFace,
        selectedFacePlane,
        setSketchMode,
        showSketches,
        toggleSketchVisibility,
        codeContext,
        toggleSidePanel,
        sidePanelVisible,
        openPanel
    } = useWorkbench();

    // Separate creation tools vs construction vs modification tools
    const creationTools = features.filter(f => ['box', 'cylinder'].includes(f.id));
    const constructionTools = features.filter(f => ['offsetPlane'].includes(f.id));
    const modificationTools = features.filter(f => ['extrude', 'revolve', 'fillet', 'chamfer', 'cut', 'union', 'intersect'].includes(f.id));

    // Start sketch mode
    const handleSketchClick = () => {
        if (selectedFace) {
            handleSketchOnFaceClick();
        } else {
            openPanel('planeSelector');
        }
    };

    const handleSketchOnFaceClick = () => {
        if (!selectedFace || !selectedFacePlane) return;

        // Map shapeIndex to variable name using unified context
        const targetName = codeContext.returnedVariables[selectedFace.shapeIndex];

        // Enter sketch mode on this face plane
        setSketchMode({
            active: true,
            plane: buildFaceSketchPlaneEntity({
                faceId: selectedFace.faceId,
                targetName,
                origin: selectedFacePlane.origin,
                normal: selectedFacePlane.normal
            }),
            currentSketch: null,
            tool: 'line'
        });
    };

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

            <div className="w-full h-px bg-[#333] my-1" />

            {/* Sketch button */}
            <button
                onClick={handleSketchClick}
                data-testid="toolbar-sketch"
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                aria-label="Sketch"
                title={formatTooltip(
                    selectedFace ? "Sketch on Face" : "Sketch",
                    SHORTCUT_HINTS.sketch
                )}
            >
                <PenTool size={20} className={selectedFace ? "text-blue-400" : ""} />
            </button>

            {/* Visibility toggle button */}
            <button
                onClick={toggleSketchVisibility}
                className={`p-2 rounded hover:bg-[#333] transition-colors ${showSketches ? 'text-blue-400' : 'text-gray-500'}`}
                aria-label="Sketch Visibility"
                title={formatTooltip(showSketches ? "Hide Sketches" : "Show Sketches", undefined)}
            >
                {showSketches ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>

            {/* Contextual Tools (only Extrude Face now) */}
            {selectedFacePlane && (
                <>
                    {/* Contextual Extrude Face button */}
                    <button
                        onClick={() => {
                            const feature = features.find(f => f.id === 'extrudeFromFace');
                            if (feature) onToolClick(feature);
                        }}
                        data-testid="toolbar-extrude-face"
                        className="p-2 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 transition-colors mt-1"
                        aria-label="Extrude Face"
                        title="Extrude Face"
                    >
                        <ArrowUpFromLine size={20} />
                    </button>
                    <div className="w-full h-px bg-[#333] my-1" />
                </>
            )}

            <div className="w-full h-px bg-[#333] my-1" />

            {creationTools.length > 0 && (
                <>
                    <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Add</span>
                    {creationTools.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => onToolClick(feature)}
                            className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                            aria-label={feature.label}
                            title={formatTooltip(feature.label, FEATURE_SHORTCUTS[feature.id], feature.description)}
                        >
                            <feature.icon size={20} />
                        </button>
                    ))}
                    <div className="w-full h-px bg-[#333] my-1" />
                </>
            )}

            {constructionTools.length > 0 && (
                <>
                    <span className="text-[10px] uppercase text-gray-500 font-bold mb-1 text-center">Cons</span>
                    {constructionTools.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => onToolClick(feature)}
                            className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                            aria-label={feature.label}
                            title={formatTooltip(feature.label, FEATURE_SHORTCUTS[feature.id], feature.description)}
                        >
                            <feature.icon size={20} />
                        </button>
                    ))}
                    <div className="w-full h-px bg-[#333] my-1" />
                </>
            )}

            {modificationTools.length > 0 && (
                <>
                    <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Mod</span>
                    {modificationTools.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => onToolClick(feature)}
                            className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                            aria-label={feature.label}
                            title={formatTooltip(feature.label, FEATURE_SHORTCUTS[feature.id], feature.description)}
                        >
                            <feature.icon size={20} />
                        </button>
                    ))}
                </>
            )}
        </div>
    );
}
