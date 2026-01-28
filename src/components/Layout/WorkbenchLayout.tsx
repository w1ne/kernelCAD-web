import { createPlaneConstructorCode, isValidPlaneData } from '../../lib/planeUtils';
import { getReturnedVariables } from '../../lib/ast';
import { generateUniqueName } from '../../lib/codeAnalysis';
import React, { useMemo } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CodeEditor from '../Editor';
import Viewer from '../Viewer';
import Toolbar from '../Toolbar';
import ParameterDialog from '../Dialogs/ParameterDialog';
import { ExtrudeDialog } from '../Dialogs/ExtrudeDialog';
import { ExtrudeFromFaceDialog } from '../Dialogs/ExtrudeFromFaceDialog';
import { SketchOnFaceDialog } from '../Dialogs/SketchOnFaceDialog';
import { RevolveDialog } from '../Dialogs/RevolveDialog';
import { FilletDialog } from '../Dialogs/FilletDialog';
import { ChamferDialog } from '../Dialogs/ChamferDialog';
import { PlaneSelectorDialog } from '../Dialogs/PlaneSelectorDialog';
import { OffsetPlaneDialog } from '../Dialogs/OffsetPlaneDialog';
import { SketchCanvas } from '../SketchCanvas';
import { Header } from './Header';
import { SidePanel } from './SidePanel';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { featureRegistry } from '../../features/FeatureRegistry';
import { type Feature } from '../../features/types';
import { type SketchData } from '../../types/sketch';
import { type SketchPlaneEntity } from '../../types/plane';
import { generateSketchCode, generateSketchName } from '../../lib/sketchCodegen';
import { generateSketchOnFaceCode } from '../../features/core/sketchOnFace.feature';
import { generateRevolveCode } from '../../features/core/revolve.feature';
import { generateFilletCode, generateChamferCode, generateBooleanCode } from '../../features/core/modifiers.feature';
import { BooleanDialog } from '../Dialogs/BooleanDialog';
import { AlertCircle, Loader2, MousePointer2 } from 'lucide-react';

export function WorkbenchLayout() {
    const {
        viewMode,
        viewMode3D,
        code,
        setCode,
        geometries,
        error,
        isReady,
        activeDialog,
        setActiveDialog,
        editorInstance,
        setEditorInstance,
        sketchMode,
        setSketchMode,
        addSketch,
        planes,
        addPlane,
        selectedFace,
        isFaceSelecting,
        startFaceSelection,
        cancelFaceSelection,
        selectedFacePlane,
    } = useWorkbench();

    const { insertCode } = useCodeInsertion();

    // Get all features for the toolbar
    const features = useMemo(() => featureRegistry.getAll(), []);

    const activeFeature = useMemo(() => {
        return activeDialog ? featureRegistry.get(activeDialog) : null;
    }, [activeDialog]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        // E -> Extrude
        'e': (e) => {
            if (activeDialog) return; // Don't override open dialogs
            if (selectedFace) {
                // If face selected, smart extrude
                const feature = featureRegistry.get('extrudeFromFace');
                if (feature) feature.execute({ insertCode, setActiveDialog, code });
            } else {
                // Normal extrude
                const feature = featureRegistry.get('extrude');
                if (feature) feature.execute({ insertCode, setActiveDialog, code });
            }
        },
        // S -> Sketch (Smart)
        's': (e) => {
            if (activeDialog || sketchMode.active) return;
            if (selectedFace) {
                // Contextual logic handled in Toolbar usually, replicated here
                // Actually we can't easily replicate the complex logic from Toolbar without duplicating it.
                // Ideally this logic moves to a helper or hook.
                // For now, trigger Plane Selector if no face, or let user pick face first.
                // Let's just open Plane Selector for 's' if no face is selected.
                setActiveDialog('planeSelector');
            } else {
                setActiveDialog('planeSelector');
            }
        },
        // P -> Construction Plane
        'p': (e) => {
            if (activeDialog) return;
            const feature = featureRegistry.get('offsetPlane');
            if (feature) feature.execute({ insertCode, setActiveDialog, code });
        },
        // Esc -> Cancel / Close
        'escape': (e) => {
            if (activeDialog) {
                setActiveDialog(null);
            }
            if (isFaceSelecting) {
                cancelFaceSelection();
            }
            // Sketch mode cancel is handled in SketchCanvas usually, but if we are here
            // we are mostly fine.
        }
    });


    // Refresh editor layout when switching modes
    React.useEffect(() => {
        if (viewMode === 'code' && editorInstance) {
            setTimeout(() => editorInstance.layout(), 350);
        }
    }, [viewMode, editorInstance]);

    const handleEditorDidMount = (editor: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setEditorInstance(editor);
    };

    const handleToolClick = (feature: Feature) => {
        if (feature.parameters && feature.parameters.length > 0) {
            setActiveDialog(feature.id);
        } else {
            feature.execute({ insertCode, setActiveDialog, code });
        }
    };

    const handleDialogSubmit = (values: Record<string, number>) => {
        if (activeFeature) {
            activeFeature.execute({ insertCode, setActiveDialog, code }, values);
        }
    };

    const handleJumpToLine = (line: number) => {
        if (editorInstance) {
            editorInstance.setPosition({ lineNumber: line, column: 1 });
            editorInstance.revealLineInCenter(line);
            editorInstance.focus();
        }
    };

    if (!isReady) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Initializing Kernel...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane */}
                <div className={`h-full flex flex-col border-r border-[#333] transition-all duration-300 ${viewMode === 'code' ? 'w-[40%]' : 'w-[250px]'}`}>
                    <div className="flex-1 relative overflow-hidden flex">
                        <Toolbar features={features} onToolClick={handleToolClick} />

                        <div className="flex-1 h-full relative flex flex-col">
                            {/* GUI Mode: Scene Browser */}
                            {viewMode === 'gui' && (
                                <SidePanel onJumpToLine={handleJumpToLine} />
                            )}

                            {/* Code Mode: Editor */}
                            <div className={`flex-1 h-full relative ${viewMode === 'gui' ? 'hidden' : ''}`}>
                                <CodeEditor
                                    value={code}
                                    onChange={(v) => setCode(v || '')}
                                    onMount={handleEditorDidMount}
                                />
                                {error && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-100 p-3 rounded-lg border border-red-700/50 shadow-xl backdrop-blur-md text-xs font-mono flex gap-2 items-start pointer-events-none">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <pre className="whitespace-pre-wrap">{error}</pre>
                                    </div>
                                )}
                            </div>

                            {/* Dialog Overlay */}
                            {activeFeature && activeFeature.parameters && (
                                <ParameterDialog
                                    key={activeFeature.id}
                                    isOpen={!!activeDialog}
                                    onClose={() => setActiveDialog(null)}
                                    onSubmit={handleDialogSubmit}
                                    title={activeFeature.label}
                                    fields={activeFeature.parameters.map(p => ({
                                        key: p.name,
                                        label: p.label,
                                        defaultValue: p.defaultValue,
                                        step: p.step
                                    }))}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Pane: 3D Viewport */}
                <div className="flex-1 h-full relative bg-[#0a0a0a]">
                    <Viewer
                        geometries={geometries}
                        sketchesGeometries={[]} // TODO: Connect to real sketches
                        showSketches={true}
                        viewMode3D={viewMode3D}
                    />
                    {isFaceSelecting && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="bg-blue-600/90 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce backdrop-blur-sm border border-blue-400/50 pointer-events-auto flex items-center gap-3">
                                <MousePointer2 className="w-5 h-5" />
                                <span className="font-bold">Click a face to start sketching</span>
                                <button
                                    onClick={cancelFaceSelection}
                                    className="ml-2 hover:bg-white/20 p-1 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sketch Canvas Overlay */}
            {sketchMode.active && sketchMode.plane && (
                <SketchCanvas
                    plane={sketchMode.plane}
                    onComplete={(entities) => {
                        // Generate sketch name
                        const sketchName = generateSketchName(code);

                        // Create sketch data
                        const sketchData: SketchData = {
                            id: `sketch_${Date.now()}`,
                            name: sketchName,
                            plane: (sketchMode.plane as any).name || 'XY',
                            entities,
                            closed: false,
                            createdAt: Date.now(),
                        };

                        // Generate Replicad code
                        const planeEntity = sketchMode.plane as any;
                        let sketchCode = '';

                        if (planeEntity && planeEntity.type === 'face' && planeEntity.origin && planeEntity.normal) {
                            // Sketch on face: create a plane from origin and normal
                            const planeSource = createPlaneConstructorCode(
                                planeEntity.origin,
                                planeEntity.normal
                            );
                            sketchCode = generateSketchCode({ ...sketchData, plane: planeSource });
                        } else {
                            sketchCode = generateSketchCode(sketchData);
                        }

                        // Insert sketch code
                        insertCode(sketchCode);

                        // Track sketch history
                        addSketch(sketchData);

                        // Exit sketch mode
                        setSketchMode({
                            active: false,
                            plane: null,
                            currentSketch: null,
                            tool: 'select',
                        });
                    }}
                    onCancel={() => {
                        setSketchMode({
                            active: false,
                            plane: null,
                            currentSketch: null,
                            tool: 'select',
                        });
                    }}
                />
            )}

            {/* Plane Selector Dialog */}
            {activeDialog === 'planeSelector' && (
                <PlaneSelectorDialog
                    onSelect={(plane) => {
                        setSketchMode({
                            active: true,
                            plane: plane,
                            currentSketch: null,
                            tool: 'line',
                        });
                        setActiveDialog(null);
                    }}
                    onSelectFace={startFaceSelection}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Extrude Dialog */}
            {activeDialog === 'extrude' && (
                <ExtrudeDialog
                    onConfirm={({ sketchName, distance, direction }) => {
                        // Generate extrude code
                        const extrudeCode = direction === 'reversed'
                            ? `\nconst extruded${sketchName.replace('sketch', '')} = ${sketchName}.extrude(-${distance});`
                            : `\nconst extruded${sketchName.replace('sketch', '')} = ${sketchName}.extrude(${distance});`;

                        // Insert extrude code
                        insertCode(extrudeCode);

                        // Close dialog
                        setActiveDialog(null);
                    }}
                    onCancel={() => {
                        setActiveDialog(null);
                    }}
                />
            )}

            {/* Extrude From Face Dialog */}
            {activeDialog === 'extrudeFromFace' && (
                <ExtrudeFromFaceDialog
                    onConfirm={(distance, direction) => {
                        if (activeFeature && activeFeature.execute && selectedFace) {
                            const finalDistance = direction === 'reversed' ? -distance : distance;
                            activeFeature.execute(
                                { insertCode, setActiveDialog, code },
                                { distance: finalDistance, faceId: selectedFace.faceId, shapeIndex: selectedFace.shapeIndex }
                            );
                        }
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Sketch On Face Dialog */}
            {activeDialog === 'sketchOnFace' && selectedFace && (
                <SketchOnFaceDialog
                    defaultName={generateUniqueName(code, 'sketch1')}
                    faceId={selectedFace.faceId}
                    shapeName={getReturnedVariables(code)[selectedFace.shapeIndex] || 'shape'}
                    onConfirm={(name) => {
                        const returnedVars = getReturnedVariables(code);
                        const targetName = returnedVars[selectedFace.shapeIndex] || 'shape';
                        const snippet = generateSketchOnFaceCode(targetName, selectedFace.faceId, name);
                        insertCode(snippet);
                        setActiveDialog(null);
                        // Switch to sketch mode? Optional but helpful.
                        // setSketchMode(true); 
                        // Actually we need to wait for code update?
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Revolve Dialog */}
            {activeDialog === 'revolve' && (
                <RevolveDialog
                    onConfirm={({ sketchName, angle, axis }) => {
                        // Generate revolve code
                        const revolveCode = generateRevolveCode(sketchName, angle, axis);

                        // Insert revolve code
                        insertCode(revolveCode);

                        // Close dialog
                        setActiveDialog(null);
                    }}
                    onCancel={() => {
                        setActiveDialog(null);
                    }}
                />
            )}

            {/* Fillet Dialog */}
            {activeDialog === 'fillet' && (
                <FilletDialog
                    onConfirm={({ targetName, radius, filterType }) => {
                        const code = generateFilletCode(targetName, radius, filterType);
                        insertCode(code);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Chamfer Dialog */}
            {activeDialog === 'chamfer' && (
                <ChamferDialog
                    onConfirm={({ targetName, distance, filterType }) => {
                        const code = generateChamferCode(targetName, distance, filterType);
                        insertCode(code);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Boolean Operations Dialogs */}
            {['union', 'cut', 'intersect'].includes(activeDialog || '') && (
                <BooleanDialog
                    type={activeDialog === 'union' ? 'fuse' : (activeDialog as 'cut' | 'intersect')}
                    onConfirm={({ baseName, toolName, type }) => {
                        const code = generateBooleanCode(baseName, toolName, type);
                        insertCode(code);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Offset Plane Dialog */}
            {activeDialog === 'offsetPlane' && (
                <OffsetPlaneDialog
                    onConfirm={({ basePlaneId, offset }) => {
                        // Check if base is a face or a plane
                        if (basePlaneId.startsWith('face-')) {
                            // Handle Face Reference
                            const faceId = parseInt(basePlaneId.replace('face-', '').split('-')[0]);
                            if (selectedFace && selectedFace.faceId === faceId && geometries[selectedFace.shapeIndex]) {
                                const { shapeIndex } = selectedFace;
                                const geometry = geometries[shapeIndex];
                                const face = geometry.faces.find(f => f.faceId === faceId);

                                if (face && face.plane && isValidPlaneData(face.plane)) {
                                    // Resolve variable name
                                    const returnedVars = getReturnedVariables(code);
                                    let targetName = returnedVars[shapeIndex] || 'shape';
                                    if (targetName === 'unknown') targetName = 'shape';

                                    // Generate unique variable name
                                    const baseName = `plane_${targetName}_face${faceId}`;
                                    const uniqueName = generateUniqueName(code, baseName);

                                    // Generate code based on offset
                                    let planeCode = createPlaneConstructorCode(face.plane.origin, face.plane.normal);

                                    // If there's an offset, we need to create an offset plane from this "virtual" datum plane
                                    // But Replicad's offsetPlane API works on existing Plane objects.
                                    // Code: new Plane(...)
                                    // If offset != 0, we can modify the origin in the valid way or use .offset() if available?
                                    // Replicad Plane constructor: (origin, xDir, normal)
                                    // We can just compute the new origin: origin + normal * offset

                                    if (offset !== 0) {
                                        const [ox, oy, oz] = face.plane.origin;
                                        const [nx, ny, nz] = face.plane.normal;
                                        const newOrigin: [number, number, number] = [
                                            ox + nx * offset,
                                            oy + ny * offset,
                                            oz + nz * offset
                                        ];
                                        planeCode = createPlaneConstructorCode(newOrigin, face.plane.normal);
                                    }

                                    const codeToInsert = `const ${uniqueName} = ${planeCode};\n`;
                                    insertCode(codeToInsert);

                                    // Add to planes list
                                    addPlane({
                                        id: uniqueName,
                                        name: offset === 0 ? `Datum (Face ${faceId})` : `Offset ${offset} (Face ${faceId})`,
                                        type: 'face',
                                        origin: offset === 0 ? face.plane.origin : [
                                            face.plane.origin[0] + face.plane.normal[0] * offset,
                                            face.plane.origin[1] + face.plane.normal[1] * offset,
                                            face.plane.origin[2] + face.plane.normal[2] * offset,
                                        ],
                                        normal: face.plane.normal,
                                        visible: true,
                                        parentId: targetName
                                    });
                                }
                            }
                        } else {
                            // Handle Existing Plane Reference
                            const basePlane = planes.find(p => p.id === basePlaneId);
                            if (basePlane) {
                                const newId = `plane-${Date.now()}`;
                                const newName = `Offset Plane ${planes.length - 2}`; // -3 base planes + 1

                                // Code generation for offset plane from existing plane variable
                                // We need to find the variable name for the base plane
                                // For basic planes (XY, XZ, YZ), we use 'Plane.XY', etc.
                                // For custom planes, we use their ID (which should be the variable name)

                                let planeRefCode = '';
                                if (basePlane.type === 'base') {
                                    const name = basePlane.name.replace('Origin ', '');
                                    planeRefCode = `Plane.${name}`;
                                    // Replicad might not have a simple .offset() method on the static Plane.XY
                                    // We might need to construct a new plane manually.
                                    // Actually Replicad planes have an offset method? No, usually separate class.
                                    // Safest is to construct a new Plane.
                                } else {
                                    planeRefCode = basePlane.id;
                                }

                                // Calculate new origin
                                const [ox, oy, oz] = basePlane.origin;
                                const [nx, ny, nz] = basePlane.normal;
                                const newOrigin: [number, number, number] = [
                                    ox + nx * offset,
                                    oy + ny * offset,
                                    oz + nz * offset
                                ];

                                const planeCode = createPlaneConstructorCode(newOrigin, basePlane.normal);
                                const uniqueName = generateUniqueName(code, 'plane_offset');
                                const codeToInsert = `const ${uniqueName} = ${planeCode};\n`;
                                insertCode(codeToInsert);

                                const newPlane: SketchPlaneEntity = {
                                    id: uniqueName, // Use variable name as ID
                                    name: newName,
                                    type: 'offset',
                                    origin: newOrigin,
                                    normal: [...basePlane.normal] as [number, number, number],
                                    visible: true,
                                    parentId: basePlaneId
                                };

                                addPlane(newPlane);
                            }
                        }
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

        </div>
    );
}
