import { PenTool, ArrowUpFromLine, Eye, EyeOff } from 'lucide-react';
import { type Feature } from '../features/types';
import { useWorkbench } from '../context/WorkbenchContext';
import { getReturnedVariables } from '../lib/ast';

interface ToolbarProps {
    features: Feature[];
    onToolClick: (feature: Feature) => void;
}

export default function Toolbar({ features, onToolClick }: ToolbarProps) {
    const {
        setActiveDialog,
        selectedFace,
        selectedFacePlane,
        setSketchMode,
        showSketches,
        toggleSketchVisibility,
        code
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
            setActiveDialog('planeSelector');
        }
    };

    const handleSketchOnFaceClick = () => {
        if (!selectedFace || !selectedFacePlane) return;

        // Map shapeIndex to variable name using AST
        const returnedVars = getReturnedVariables(code);
        const targetName = returnedVars[selectedFace.shapeIndex] || 'shape';

        // Enter sketch mode on this face plane
        setSketchMode({
            active: true,
            plane: {
                id: `face-${selectedFace.faceId}-${Date.now()}`,
                name: `Face ${selectedFace.faceId} of ${targetName}`,
                type: 'face',
                origin: selectedFacePlane.origin,
                normal: selectedFacePlane.normal,
                visible: true,
                parentId: targetName
            },
            currentSketch: null,
            tool: 'line'
        });
    };

    return (
        <div className="flex flex-col gap-2 p-2 bg-[#111] border-r border-[#333] w-14 items-center">
            {/* Sketch button */}
            <button
                onClick={handleSketchClick}
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                title={selectedFace ? "Sketch on Selected Face" : "Start Sketch (Select Plane)"}
            >
                <PenTool size={20} className={selectedFace ? "text-blue-400" : ""} />
            </button>

            {/* Visibility toggle button */}
            <button
                onClick={toggleSketchVisibility}
                className={`p-2 rounded hover:bg-[#333] transition-colors ${showSketches ? 'text-blue-400' : 'text-gray-500'}`}
                title={showSketches ? "Hide Sketches" : "Show Sketches"}
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
                        className="p-2 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 transition-colors mt-1"
                        title="Extrude Selected Face"
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
                            title={feature.label}
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
                            title={feature.label}
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
                            title={feature.label}
                        >
                            <feature.icon size={20} />
                        </button>
                    ))}
                </>
            )}
        </div>
    );
}
