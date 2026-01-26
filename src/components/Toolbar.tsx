import { type Feature } from '../features/types';

interface ToolbarProps {
    features: Feature[];
    onToolClick: (feature: Feature) => void;
}

export default function Toolbar({ features, onToolClick }: ToolbarProps) {
    // Separate creation tools vs modification tools?
    // For now, just one list.
    const creationTools = features.filter(f => ['box', 'cylinder'].includes(f.id));
    const modificationTools = features.filter(f => !['box', 'cylinder'].includes(f.id));

    return (
        <div className="flex flex-col gap-2 p-2 bg-[#111] border-r border-[#333] w-14 items-center">
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
