// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { readThemeColor } from '../overlays/themeColor';
import { CAD_COLORS_HEX } from '../../../../shared/constants/colors';
import { DimensionGraphic } from '../overlays/DimensionGraphic';
import { ScreenScaled } from '../overlays/ScreenScaled';
import { buildVisibleEdgePolylines } from './edgePolylines';
import { formatDeltas, formatDiameter, formatLength, vdist, type Vec3 } from './measureMath';
import type { SnapHit } from './measureSnap';
import { applyClick, EMPTY_MEASURE, type MeasureState } from './measureState';
import { useMeasurePointer } from './useMeasurePointer';
import { useViewerSnapper } from './useViewerSnapper';
import { createMarkupId, makeDiameterMeasurement, makeDistanceMeasurement, type MarkupMeasurement } from '../../../markup/markupSnapshot';

interface MeasureToolProps {
  geometries: readonly GeometryResult[];
  itemNames: readonly (string | null)[];
  hiddenIds: readonly string[];
  onMeasurementAdded?: (measurement: MarkupMeasurement) => boolean;
}

const SNAP_COLORS = { vertex: CAD_COLORS_HEX.snap, edge: CAD_COLORS_HEX.highlight, face: CAD_COLORS_HEX.guide } as const;

function SnapMarker({ hit }: { hit: SnapHit }) {
  const color = SNAP_COLORS[hit.kind];
  return (
    <ScreenScaled position={hit.point}>
      <mesh renderOrder={3100} data-testid="measure-snap">
        <ringGeometry args={[4, 6, 24]} />
        <meshBasicMaterial color={color} depthTest={false} depthWrite={false} transparent />
      </mesh>
      <mesh renderOrder={3101}>
        <circleGeometry args={[1.8, 12]} />
        <meshBasicMaterial color={color} depthTest={false} depthWrite={false} transparent />
      </mesh>
    </ScreenScaled>
  );
}

function Dimensions({ state }: { state: MeasureState }) {
  const { diameter, a, b } = state;
  return (
    <>
      {diameter && (
        <DimensionGraphic kind="diameter" a={diameter.a} b={diameter.b} label={formatDiameter(diameter.value)} />
      )}
      {a && b && (
        <DimensionGraphic kind="linear" a={a} b={b} label={formatLength(vdist(a, b))} sublabel={formatDeltas(a, b)} />
      )}
      {a && !b && <ScreenScaled position={a as Vec3}><mesh renderOrder={3100}><circleGeometry args={[3, 12]} /><meshBasicMaterial color={readThemeColor('--kc-warn', 0xffb703)} depthTest={false} /></mesh></ScreenScaled>}
    </>
  );
}

/**
 * Click-to-measure inside the viewer canvas: snaps to edge corners, then edge
 * points, then faces; two clicks draw a dimension, a click on a circular edge
 * reads its diameter at once. Completed values are passed to Studio markup
 * when a persistence callback is supplied; an accepted value clears the local
 * preview immediately.
 */
export function MeasureTool({ geometries, itemNames, hiddenIds, onMeasurementAdded }: MeasureToolProps) {
  const dom = useThree((s) => s.gl.domElement);
  const polylines = useMemo(
    () => buildVisibleEdgePolylines(geometries, itemNames, hiddenIds),
    [geometries, itemNames, hiddenIds],
  );
  const snapAt = useViewerSnapper(polylines, geometries);
  const [state, setState] = useState<MeasureState>(EMPTY_MEASURE);
  const stateRef = useRef<MeasureState>(EMPTY_MEASURE);
  const [hover, setHover] = useState<SnapHit | null>(null);

  useMeasurePointer(dom, {
    onHover: (p) => setHover(snapAt(p)),
    onTap: (p) => {
      const hit = snapAt(p);
      setHover(hit);
      if (!hit) return;
      const current = stateRef.current;
      const next = applyClick(current, hit, polylines);
      let completed: MarkupMeasurement | null = null;
      if (current.a && !current.b) {
        completed = makeDistanceMeasurement({
          id: createMarkupId('measure-'),
          a: [...current.a] as [number, number, number],
          b: [...hit.point] as [number, number, number],
          refs: [...current.aRefs, ...hit.refs],
        });
      } else if (next.diameter && next.diameter !== current.diameter) {
        completed = makeDiameterMeasurement({
          id: createMarkupId('measure-'),
          a: [...next.diameter.a] as [number, number, number],
          b: [...next.diameter.b] as [number, number, number],
          refs: next.diameter.refs,
          value: next.diameter.value,
        });
      }
      if (completed && onMeasurementAdded?.(completed)) {
        stateRef.current = EMPTY_MEASURE;
        setState(EMPTY_MEASURE);
        return;
      }
      stateRef.current = next;
      setState(next);
    },
    onEscape: () => { stateRef.current = EMPTY_MEASURE; setState(EMPTY_MEASURE); },
  });

  return (
    <group name="measure-tool">
      <Dimensions state={state} />
      {hover && <SnapMarker hit={hover} />}
    </group>
  );
}
