import { PenTool, MousePointer2, ArrowUpFromLine } from 'lucide-react';
import { type Feature } from '../features/types';
import { useWorkbench } from '../context/WorkbenchContext';
import { generateSketchOnFaceCode } from '../features/core/sketchOnFace.feature';

interface ToolbarProps {
    features: Feature[];
    onToolClick: (feature: Feature) => void;
}

export default function Toolbar({ features, onToolClick }: ToolbarProps) {
    const { setActiveDialog, selectedFace, selectedFacePlane, insertCode, setSketchMode } = useWorkbench();

    // Separate creation tools vs construction vs modification tools
    const creationTools = features.filter(f => ['box', 'cylinder'].includes(f.id));
    const constructionTools = features.filter(f => ['offsetPlane'].includes(f.id));
    const modificationTools = features.filter(f => ['extrude', 'revolve', 'fillet', 'chamfer', 'cut', 'union', 'intersect'].includes(f.id));

    // Start sketch mode
    const handleSketchClick = () => {
        setActiveDialog('planeSelector');
    };

    const handleSketchOnFaceClick = () => {
        if (!selectedFace || !selectedFacePlane) return;

        // Try to identify target shape. For now simple placeholder or 'shape'
        // Ideally we map shapeIndex to variable name.
        const targetName = 'shape';
        const code = generateSketchOnFaceCode(targetName, selectedFace.faceId);

        insertCode(code);

        // Enter sketch mode on this new plane
        setSketchMode({
            active: true,
            plane: {
                id: `face-${selectedFace.faceId}`,
                name: `Face ${selectedFace.faceId}`,
                type: 'face',
                origin: selectedFacePlane.origin,
                normal: selectedFacePlane.normal,
                visible: true
            },
            currentSketch: {
                id: `sketch-${Date.now()}`,
                name: `sketchFromFace${selectedFace.faceId}`,
                plane: `face-${selectedFace.faceId}`,
                entities: [],
                closed: false,
                createdAt: Date.now()
            },
            tool: 'line'
        });
    };

    return (
        <div className="flex flex-col gap-2 p-2 bg-[#111] border-r border-[#333] w-14 items-center">
            {/* Sketch button */}
            <button
                onClick={handleSketchClick}
                className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors"
                title="Start Sketch (Plane Selection)"
            >
                <PenTool size={20} />
            </button>

            {/* Contextual Sketch on Face button */}
            {selectedFacePlane && (
                <>
                    <button
                        onClick={handleSketchOnFaceClick}
                        className="p-2 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 transition-colors mt-1"
                        title="Sketch on Selected Face"
                    >
                        <MousePointer2 size={20} />
                    </button>
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
