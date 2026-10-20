// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Html } from '@react-three/drei/web/Html';
import { Line } from '@react-three/drei/core/Line';
import { useMemo, useSyncExternalStore } from 'react';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { CAD_COLORS_HEX } from '../../../../shared/constants/colors';
import { markupStore } from '../../../markup/markupStore';
import { buildVisibleEdgePolylines, type EdgePolyline } from '../measure/edgePolylines';
import { FaceSelectionOverlay } from '../entities/ShapeGeometry';
import { matrixFromGeometryTransform } from '../entities/geometryTransform';
import { DimensionGraphic } from '../overlays/DimensionGraphic';
import { ScreenScaled } from '../overlays/ScreenScaled';
import { formatDiameter, formatLength } from '../measure/measureMath';

function pointsOf(edge: EdgePolyline): [number, number, number][] {
  return Array.from({ length: edge.pts.length / 3 }, (_, i) => [edge.pts[i * 3]!, edge.pts[i * 3 + 1]!, edge.pts[i * 3 + 2]!]);
}

function NoteGraphic({ id, number, text, anchor, strokePoints }: {
  id: string;
  number: number;
  text: string;
  anchor: readonly [number, number, number];
  strokePoints?: readonly (readonly [number, number, number])[];
}) {
  return (
    <group name={`markup-note-${id}`}>
      <ScreenScaled position={anchor}>
        <mesh renderOrder={3200}>
          <ringGeometry args={[5, 7, 24]} />
          <meshBasicMaterial color={CAD_COLORS_HEX.highlight} depthTest={false} depthWrite={false} />
        </mesh>
        <mesh renderOrder={3201}>
          <circleGeometry args={[2, 16]} />
          <meshBasicMaterial color={CAD_COLORS_HEX.highlight} depthTest={false} depthWrite={false} />
        </mesh>
      </ScreenScaled>
      <Html position={anchor} style={{ pointerEvents: 'none', marginLeft: 14 }} zIndexRange={[32, 20]}>
        <div className="max-w-56 rounded-control border border-border-strong bg-surface-1/95 px-2 py-1 text-2xs text-fg shadow-e1">
          <span className="mr-1 font-semibold text-accent">{number}.</span>{text}
        </div>
      </Html>
      {strokePoints && strokePoints.length > 1 && (
        <Line points={strokePoints as [number, number, number][]} color={CAD_COLORS_HEX.highlight} lineWidth={3} depthTest={false} />
      )}
    </group>
  );
}

function SelectionFace({ geometry, faceId }: { geometry: GeometryResult; faceId: number }) {
  const face = geometry.faces.find((candidate) => candidate.faceId === faceId);
  const transform = useMemo(() => matrixFromGeometryTransform(geometry), [geometry]);
  if (!face) return null;
  return (
    <group matrix={transform} matrixAutoUpdate={transform ? false : undefined}>
      <FaceSelectionOverlay face={face} isSelected />
    </group>
  );
}

export function MarkupLayer({
  geometries,
  itemNames,
  hiddenIds,
}: {
  geometries: readonly GeometryResult[];
  itemNames: readonly (string | null)[];
  hiddenIds: readonly string[];
}) {
  const state = useSyncExternalStore(markupStore.subscribe, markupStore.getSnapshot, markupStore.getSnapshot);
  const edges = useMemo(() => buildVisibleEdgePolylines(geometries, itemNames, hiddenIds), [geometries, itemNames, hiddenIds]);
  const edgeByRef = new Map(edges.map((edge) => [`${edge.ref.shapeIndex}:edge:${edge.ref.id}`, edge]));

  return (
    <group name="studio-markup-layer">
      {state.topologyRefs.map((ref) => {
        if (ref.kind === 'face') {
          const geometry = geometries[ref.shapeIndex];
          return geometry ? <SelectionFace key={`${ref.shapeIndex}:face:${ref.id}`} geometry={geometry} faceId={ref.id} /> : null;
        }
        const edge = edgeByRef.get(`${ref.shapeIndex}:edge:${ref.id}`);
        return edge ? <Line key={`${ref.shapeIndex}:edge:${ref.id}`} points={pointsOf(edge)} color={CAD_COLORS_HEX.selection} lineWidth={3} depthTest={false} /> : null;
      })}
      {state.notes.map((note, index) => (
        <NoteGraphic key={note.id} id={note.id} number={index + 1} text={note.text} anchor={note.anchor} strokePoints={note.strokePoints} />
      ))}
      {state.measurements.map((measurement) => (
        <DimensionGraphic
          key={measurement.id}
          kind={measurement.type === 'diameter' ? 'diameter' : 'linear'}
          a={measurement.endpoints[0]}
          b={measurement.endpoints[1]}
          label={measurement.type === 'diameter' ? formatDiameter(measurement.value) : formatLength(measurement.value)}
        />
      ))}
    </group>
  );
}
