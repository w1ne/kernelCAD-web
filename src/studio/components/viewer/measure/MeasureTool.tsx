// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useMemo, useState } from 'react';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { readThemeColor } from '../overlays/themeColor';
import { CAD_COLORS_HEX } from '../../../../shared/constants/colors';
import { DimensionGraphic } from '../overlays/DimensionGraphic';
import { ScreenScaled } from '../overlays/ScreenScaled';
import { buildEdgePolylines, visibleGeometries } from './edgePolylines';
import { formatDeltas, formatDiameter, formatLength, vdist, type Vec3 } from './measureMath';
import type { SnapHit } from './measureSnap';
import { applyClick, EMPTY_MEASURE, type MeasureState } from './measureState';
import { useMeasurePointer } from './useMeasurePointer';
import { useViewerSnapper } from './useViewerSnapper';

interface MeasureToolProps {
  geometries: readonly GeometryResult[];
  itemNames: readonly (string | null)[];
  hiddenIds: readonly string[];
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
 * reads its diameter at once. Mounted only while the Measure button is on, so
 * turning it off clears everything.
 */
export function MeasureTool({ geometries, itemNames, hiddenIds }: MeasureToolProps) {
  const dom = useThree((s) => s.gl.domElement);
  const polylines = useMemo(
    () => buildEdgePolylines(visibleGeometries(geometries, itemNames, hiddenIds)),
    [geometries, itemNames, hiddenIds],
  );
  const snapAt = useViewerSnapper(polylines);
  const [state, setState] = useState<MeasureState>(EMPTY_MEASURE);
  const [hover, setHover] = useState<SnapHit | null>(null);

  useMeasurePointer(dom, {
    onHover: (p) => setHover(snapAt(p)),
    onTap: (p) => {
      const hit = snapAt(p);
      setHover(hit);
      if (hit) setState((s) => applyClick(s, hit, polylines));
    },
    onEscape: () => setState(EMPTY_MEASURE),
  });

  return (
    <group name="measure-tool">
      <Dimensions state={state} />
      {hover && <SnapMarker hit={hover} />}
    </group>
  );
}
