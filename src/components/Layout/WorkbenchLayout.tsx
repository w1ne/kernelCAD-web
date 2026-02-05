import { createPlaneConstructorCode, isValidPlaneData } from '../../lib/planeUtils';
import React, { useMemo } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
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
import { useWorkbench } from '../../context/WorkbenchContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { featureRegistry } from '../../features/FeatureRegistry';
import { type Feature, type DialogField } from '../../features/types';
import { type SketchData, type SketchPlane } from '../../types/sketch';
import type { SketchPlaneEntity } from '../../types/plane';
import { generateSketchCode, generateSketchBody } from '../../lib/sketchCodegen';
import { generateSketchOnFaceCode } from '../../features/core/sketchOnFace.feature';
import { generateExtrudeCode } from '../../features/core/extrude.feature';
import { generateRevolveCode } from '../../features/core/revolve.feature';
import { generateFilletCode, generateChamferCode, generateBooleanCode } from '../../features/core/modifiers.feature';
import { BooleanDialog } from '../Dialogs/BooleanDialog';
import { Loader2 } from 'lucide-react';

// Modular Panels
import { EditorPanel } from './EditorPanel';
import { ViewerPanel } from './ViewerPanel';
import { NavigationPanel } from './NavigationPanel';

export function WorkbenchLayout() {
    const {
        viewMode,
        viewMode3D,
        code,
        setCode,
        commandManager,
        geometries,
        sketchesGeometries,
        showSketches,
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
        selectedFacePlane,
        selectedSketchName,
        isFaceSelecting,
        startFaceSelection,
        cancelFaceSelection,
        codeContext,
    } = useWorkbench();

    // Expose helpers for E2E testing
	    React.useEffect(() => {
	        if (typeof window !== 'undefined') {
	            window.setCode = setCode;
	            window.getCode = () => code;
	            window.isEditorReady = !!editorInstance;
	        }
	    }, [setCode, code, editorInstance]);

    const { insertCode } = useCodeInsertion();

    const features = useMemo(() => featureRegistry.getAll(), []);
    const activeFeature = useMemo(() => activeDialog ? featureRegistry.get(activeDialog) : null, [activeDialog]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        'e': () => {
            if (activeDialog) return;
            const featureId = selectedFace ? 'extrudeFromFace' : 'extrude';
            const feature = featureRegistry.get(featureId);
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'r': () => {
            if (activeDialog) return;
            const feature = featureRegistry.get('revolve');
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'f': () => {
            if (activeDialog) return;
            const feature = featureRegistry.get('fillet');
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'c': () => {
            if (activeDialog) return;
            const feature = featureRegistry.get('chamfer');
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'j': () => {
            if (activeDialog) return;
            const feature = featureRegistry.get('union');
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'x': () => {
            if (activeDialog) return;
            const feature = featureRegistry.get('cut');
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'i': () => {
            if (activeDialog) return;
            const feature = featureRegistry.get('intersect');
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'mod+z': () => {
            if (activeDialog) return;
            commandManager.undo();
        },
        'mod+shift+z': () => {
            if (activeDialog) return;
            commandManager.redo();
        },
        'mod+y': () => {
            if (activeDialog) return;
            commandManager.redo();
        },
        's': () => {
            if (activeDialog || sketchMode.active) return;
            setActiveDialog('planeSelector');
        },
        'p': () => {
            if (activeDialog) return;
            const feature = featureRegistry.get('offsetPlane');
            if (feature) feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        },
        'escape': () => {
            if (activeDialog) setActiveDialog(null);
            if (isFaceSelecting) cancelFaceSelection();
        }
    });

    const handleToolClick = (feature: Feature) => {
        if (feature.parameters && feature.parameters.length > 0) {
            setActiveDialog(feature.id);
        } else {
            feature.execute({ insertCode, setCode, setActiveDialog, code, codeContext });
        }
    };

    const handleDialogSubmit = (values: Record<string, number>) => {
        if (activeFeature) {
            activeFeature.execute({ insertCode, setCode, setActiveDialog, code, codeContext }, values);
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
                <NavigationPanel
                    viewMode={viewMode}
                    features={features}
                    onToolClick={handleToolClick}
                    onJumpToLine={handleJumpToLine}
                >
                    <EditorPanel
                        code={code}
                        onChange={(v) => setCode(v)}
                        onMount={(inst) => setEditorInstance(inst)}
                        error={error}
                        visible={viewMode !== 'gui'}
                    />
                </NavigationPanel>

                <ViewerPanel
                    geometries={geometries}
                    sketchesGeometries={sketchesGeometries}
                    showSketches={showSketches}
                    viewMode3D={viewMode3D}
                    isFaceSelecting={isFaceSelecting}
                    onCancelFaceSelection={cancelFaceSelection}
                />
            </div>

            {/* Sketch Canvas Overlay */}
            {sketchMode.active && sketchMode.plane && (
                <SketchCanvas
                    plane={sketchMode.plane}
                    onComplete={(entities) => {
                        // CRITICAL: Validate entities before proceeding
                        if (!entities || entities.length === 0) {
                            console.error('Cannot create sketch: No geometry drawn');
                            alert('Please draw some geometry before completing the sketch.');
                            return;
                        }

                        // Use the name from the active sketch session if available
	                        const sketchName = sketchMode.currentSketch?.name || codeContext.generateUniqueName('sketch');
	
	                        // Parse plane name correctly (handle both string IDs and object names)
	                        let planeName: SketchPlane = 'XY';
	                        if (typeof sketchMode.plane === 'string') {
	                            planeName = sketchMode.plane;
	                        } else if (sketchMode.plane && typeof sketchMode.plane === 'object') {
	                            planeName = sketchMode.plane.name;
	                        }
	
	                        const sketchData: SketchData = {
	                            id: sketchMode.currentSketch?.id || `sketch_${Date.now()}`,
	                            name: sketchName,
	                            plane: planeName,
	                            entities,
	                            closed: false,
	                            createdAt: sketchMode.currentSketch?.createdAt || Date.now(),
	                        };
	
	                        const planeEntity: SketchPlaneEntity | null =
	                            sketchMode.plane && typeof sketchMode.plane === 'object' ? sketchMode.plane : null;
	                        let sketchCode = '';

                        // Case 1: Parametric Sketch on Face
                        if (planeEntity && planeEntity.type === 'face' && planeEntity.faceId !== undefined && planeEntity.parentId && planeEntity.parentId !== 'unknown' && planeEntity.parentId !== 'shape') {
                            const startCode = `const ${sketchName} = sketchOnFace(${planeEntity.parentId}, ${planeEntity.faceId})\n`;
                            const bodyCode = generateSketchBody(entities);
                            sketchCode = startCode + bodyCode + ';\n';
                        }
	                        // Case 2: Detached Sketch on a specific Plane object/origin
	                        else if (planeEntity && planeEntity.type === 'face' && planeEntity.origin && planeEntity.normal) {
	                            const xDir = planeEntity.xDir;
	                            const xDirStr = xDir ? JSON.stringify(xDir) : 'null';
	                            const planeCode = `new replicad.Plane(${JSON.stringify(planeEntity.origin)}, ${xDirStr}, ${JSON.stringify(planeEntity.normal)})`;
	                            const startCode = `const ${sketchName} = new Sketcher(${planeCode})\n`;
	                            const bodyCode = generateSketchBody(entities);
                            sketchCode = startCode + bodyCode + ';\n';
                        }
                        // Case 3: Standard Plane Sketch
                        else {
                            sketchCode = generateSketchCode(sketchData);
                        }

                        insertCode(sketchCode);
                        addSketch(sketchData);
                        setSketchMode({ active: false, plane: null, currentSketch: null, tool: 'select' });
                    }}
                    onCancel={() => {
                        setSketchMode({ active: false, plane: null, currentSketch: null, tool: 'select' });
                    }}
                />
            )}

            {/* Dialogs */}
	            {activeDialog === 'planeSelector' && (
	                <PlaneSelectorDialog
	                    onSelect={(plane) => {
	                        setSketchMode({ active: true, plane, currentSketch: null, tool: 'line' });
	                        setActiveDialog(null);
	                    }}
	                    onSelectFace={startFaceSelection}
	                    onCancel={() => setActiveDialog(null)}
	                />
	            )}

            {activeDialog === 'extrude' && (
                <ExtrudeDialog
                    sketchName={selectedSketchName || undefined}
                    onConfirm={({ sketchName, distance, direction }) => {
                        const extrudeCode = generateExtrudeCode(codeContext, sketchName, distance, direction === 'normal' ? 'default' : direction);
                        insertCode(extrudeCode);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {activeDialog === 'extrudeFromFace' && (
                <ExtrudeFromFaceDialog
                    onConfirm={(distance, direction) => {
                        if (activeFeature && activeFeature.execute && selectedFace) {
                            const finalDistance = direction === 'reversed' ? -distance : distance;
                            activeFeature.execute(
                                { insertCode, setCode, setActiveDialog, code, codeContext },
                                {
                                    distance: finalDistance,
                                    faceId: selectedFace.faceId,
                                    shapeIndex: selectedFace.shapeIndex,
                                    // Pass plane data for anonymous shape fallback
                                    originX: selectedFacePlane?.origin[0] || 0,
                                    originY: selectedFacePlane?.origin[1] || 0,
                                    originZ: selectedFacePlane?.origin[2] || 0,
                                    normalX: selectedFacePlane?.normal[0] || 0,
                                    normalY: selectedFacePlane?.normal[1] || 0,
                                    normalZ: selectedFacePlane?.normal[2] || 0,
                                }
                            );
                        }
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {activeDialog === 'sketchOnFace' && selectedFace && (
                <SketchOnFaceDialog
                    defaultName={codeContext.generateUniqueName('sketch')}
                    faceId={selectedFace.faceId}
                    shapeName={codeContext.getVariableAtIndex(selectedFace.shapeIndex) || 'Anonymous Shape'}
                    onConfirm={(name) => {
                        const targetName = codeContext.getVariableAtIndex(selectedFace.shapeIndex);
                        const geometry = geometries[selectedFace.shapeIndex];
                        const faceGeometry = geometry?.faces.find(f => f.faceId === selectedFace.faceId);
                        const plane = faceGeometry?.plane;

	                        const snippet = generateSketchOnFaceCode(
	                            codeContext,
	                            targetName,
	                            selectedFace.faceId,
	                            name,
	                            plane ? {
	                                origin: plane.origin,
	                                normal: plane.normal,
	                                xDir: plane.xDir
	                            } : undefined
	                        );
	                        insertCode(snippet);
	
	                        if (faceGeometry && faceGeometry.plane) {
	                            const newSketch: SketchData = {
	                                id: name,
	                                name: name,
	                                plane: 'face',
	                                entities: [],
	                                closed: false,
	                                createdAt: Date.now()
	                            };
	                            addSketch(newSketch);
	                            const planeEntity: SketchPlaneEntity = {
	                                id: `plane_${name}`,
	                                name: targetName ? `Face ${selectedFace.faceId} of ${targetName}` : `Face ${selectedFace.faceId}`,
	                                type: 'face',
	                                origin: faceGeometry.plane.origin,
	                                normal: faceGeometry.plane.normal,
	                                visible: true,
	                                parentId: targetName || undefined,
	                                faceId: selectedFace.faceId
	                            };
	                            setSketchMode({
	                                active: true,
	                                currentSketch: newSketch,
	                                tool: 'line',
	                                plane: planeEntity
	                            });
	                        }
	                        setActiveDialog(null);
	                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {activeDialog === 'revolve' && (
                <RevolveDialog
                    sketchName={selectedSketchName || undefined}
                    onConfirm={({ sketchName, angle, axis }) => {
                        const revolveCode = generateRevolveCode(codeContext, sketchName, angle, axis);
                        insertCode(revolveCode);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {activeDialog === 'fillet' && (
                <FilletDialog
                    onConfirm={({ targetName, radius, filterType }) => {
                        const codeSnippet = generateFilletCode(codeContext, targetName, radius, filterType);
                        insertCode(codeSnippet);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {activeDialog === 'chamfer' && (
                <ChamferDialog
                    onConfirm={({ targetName, distance, filterType }) => {
                        const codeSnippet = generateChamferCode(codeContext, targetName, distance, filterType);
                        insertCode(codeSnippet);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {['union', 'cut', 'intersect'].includes(activeDialog || '') && (
                <BooleanDialog
                    type={activeDialog === 'union' ? 'fuse' : (activeDialog as 'cut' | 'intersect')}
                    onConfirm={({ baseName, toolName, type }) => {
                        const codeSnippet = generateBooleanCode(codeContext, baseName, toolName, type);
                        insertCode(codeSnippet);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {activeDialog === 'offsetPlane' && (
                <OffsetPlaneDialog
                    onConfirm={({ basePlaneId, offset }) => {
                        if (basePlaneId.startsWith('face-')) {
                            const faceId = parseInt(basePlaneId.replace('face-', '').split('-')[0]);
                            if (selectedFace && selectedFace.faceId === faceId && geometries[selectedFace.shapeIndex]) {
                                const { shapeIndex } = selectedFace;
                                const geometry = geometries[shapeIndex];
                                const face = geometry.faces.find(f => f.faceId === faceId);

                                if (face && face.plane && isValidPlaneData(face.plane)) {
                                    let targetName = codeContext.getVariableAtIndex(shapeIndex) || 'shape';
                                    if (targetName === 'unknown') targetName = 'shape';
                                    const uniqueName = codeContext.generateUniqueName(`plane_${targetName}_face${faceId}`);

                                    let planeCode = createPlaneConstructorCode(face.plane.origin, face.plane.normal);
                                    let finalOrigin = [...face.plane.origin];

                                    if (offset !== 0) {
                                        const [ox, oy, oz] = face.plane.origin;
                                        const [nx, ny, nz] = face.plane.normal;
                                        finalOrigin = [ox + nx * offset, oy + ny * offset, oz + nz * offset];
                                        planeCode = createPlaneConstructorCode(finalOrigin as [number, number, number], face.plane.normal);
                                    }

                                    insertCode(`const ${uniqueName} = ${planeCode};\n`);
                                    addPlane({
                                        id: uniqueName,
                                        name: offset === 0 ? `Datum (Face ${faceId})` : `Offset ${offset} (Face ${faceId})`,
                                        type: 'face',
                                        origin: finalOrigin as [number, number, number],
                                        normal: face.plane.normal,
                                        visible: true,
                                        parentId: targetName
                                    });
                                }
                            }
                        } else {
                            const basePlane = planes.find(p => p.id === basePlaneId);
                            if (basePlane && basePlane.type === 'base') {
                                const [ox, oy, oz] = basePlane.origin;
                                const [nx, ny, nz] = basePlane.normal;
                                const newOrigin: [number, number, number] = [
                                    ox + nx * offset,
                                    oy + ny * offset,
                                    oz + nz * offset
                                ];
                                const uniqueName = codeContext.generateUniqueName('plane_offset');
                                insertCode(`const ${uniqueName} = ${createPlaneConstructorCode(newOrigin, basePlane.normal)};\n`);
                                addPlane({
                                    id: uniqueName,
                                    name: `Offset Plane ${planes.length - 2}`,
                                    type: 'offset',
                                    origin: newOrigin,
                                    normal: [...basePlane.normal] as [number, number, number],
                                    visible: true,
                                    parentId: basePlaneId
                                });
                            }
                        }
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Dialog Overlay (for features with generic parameters) */}
	            {activeFeature && activeFeature.parameters && !['extrude', 'extrudeFromFace', 'sketchOnFace', 'revolve', 'fillet', 'chamfer', 'union', 'cut', 'intersect', 'offsetPlane', 'planeSelector'].includes(activeDialog || '') && (
	                <ParameterDialog
                    key={activeFeature.id}
                    isOpen={!!activeDialog}
                    onClose={() => setActiveDialog(null)}
	                    onSubmit={handleDialogSubmit}
	                    title={activeFeature.label}
	                    fields={activeFeature.parameters.map((p: DialogField) => ({
	                        key: p.name,
	                        label: p.label,
	                        defaultValue: p.defaultValue,
	                        step: p.step
	                    }))}
	                />
	            )}
        </div>
    );
}
