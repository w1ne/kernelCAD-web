// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Place a few large-face and long-edge labels on an inspect view and list
// the rest in the legend band. On-image text is the short id (`f3`, `e12`);
// the response carries the full selector.

import { LEGEND_HEIGHT, type ViewPixels } from './stepViewDraw';
import type { InspectViewName } from './stepViewMath';

export interface LabelMark {
  id: string;
  x: number;
  y: number;
}

export interface ViewLabelPlan {
  labeledFaceIds: string[];
  legendFaceIds: string[];
  labeledEdgeIds: string[];
  legendEdgeIds: string[];
  marks: LabelMark[];
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function placeMark(
  marks: LabelMark[],
  boxes: Box[],
  id: string,
  x: number,
  y: number,
  width: number,
  modelHeight: number,
): boolean {
  const box: Box = { x: x - 4, y: y - 12, w: Math.max(18, id.length * 8), h: 14 };
  if (box.x < 2 || box.y < 2 || box.x + box.w > width - 2 || box.y + box.h > modelHeight - 2) return false;
  if (boxes.some((other) => overlaps(box, other))) return false;
  boxes.push(box);
  marks.push({ id, x: box.x, y: box.y + 11 });
  return true;
}

function placeFaces(
  input: {
    pixels: ViewPixels;
    width: number;
    modelHeight: number;
    maxLabels: number;
    faceIdsByArea: readonly { id: string; index: number }[];
  },
  marks: LabelMark[],
  boxes: Box[],
): { labeledFaceIds: string[]; legendFaceIds: string[] } {
  const labeledFaceIds: string[] = [];
  const legendFaceIds: string[] = [];
  const visibleFaces = input.faceIdsByArea.filter((face) => {
    const hit = input.pixels.facePixels.get(face.index);
    return hit !== undefined && hit.count >= 12;
  });
  for (const face of visibleFaces) {
    const hit = input.pixels.facePixels.get(face.index);
    if (!hit) continue;
    const room = labeledFaceIds.length < input.maxLabels;
    const placed = room && placeMark(marks, boxes, face.id, hit.sx / hit.count, hit.sy / hit.count, input.width, input.modelHeight);
    if (placed) labeledFaceIds.push(face.id);
    else legendFaceIds.push(face.id);
  }
  return { labeledFaceIds, legendFaceIds };
}

function placeEdges(
  input: {
    pixels: ViewPixels;
    width: number;
    modelHeight: number;
    maxLabels: number;
    edgeAnchors: readonly { id: string; index: number; x: number; y: number }[];
  },
  marks: LabelMark[],
  boxes: Box[],
): { labeledEdgeIds: string[]; legendEdgeIds: string[] } {
  const labeledEdgeIds: string[] = [];
  const legendEdgeIds: string[] = [];
  const edgeBudget = Math.max(2, Math.floor(input.maxLabels / 2));
  const visible = input.edgeAnchors.filter((edge) => (input.pixels.edgePixels.get(edge.index) ?? 0) >= 8);
  for (const edge of visible) {
    const room = labeledEdgeIds.length < edgeBudget;
    const placed = room && placeMark(marks, boxes, edge.id, edge.x, edge.y + 10, input.width, input.modelHeight);
    if (placed) labeledEdgeIds.push(edge.id);
    else legendEdgeIds.push(edge.id);
  }
  return { labeledEdgeIds, legendEdgeIds };
}

export function planViewLabels(input: {
  pixels: ViewPixels;
  width: number;
  modelHeight: number;
  maxLabels: number;
  faceIdsByArea: readonly { id: string; index: number }[];
  edgeAnchors: readonly { id: string; index: number; x: number; y: number }[];
}): ViewLabelPlan {
  const boxes: Box[] = [];
  const marks: LabelMark[] = [];
  const faces = placeFaces(input, marks, boxes);
  const edges = placeEdges(input, marks, boxes);
  return { ...faces, ...edges, marks };
}

function xml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function legendLines(plan: ViewLabelPlan, generation: string): string[] {
  const faces = plan.legendFaceIds.slice(0, 18).join(' ');
  const edges = plan.legendEdgeIds.slice(0, 18).join(' ');
  const faceMore = plan.legendFaceIds.length > 18 ? ` +${plan.legendFaceIds.length - 18}` : '';
  const edgeMore = plan.legendEdgeIds.length > 18 ? ` +${plan.legendEdgeIds.length - 18}` : '';
  return [
    `${generation}  refs are this import only`,
    `faces ${faces}${faceMore}`.trim(),
    `edges ${edges}${edgeMore}`.trim(),
  ];
}

export function labelSvg(input: {
  view: InspectViewName;
  width: number;
  height: number;
  modelHeight: number;
  plan: ViewLabelPlan;
  generation: string;
}): string {
  const texts: string[] = [];
  texts.push(
    `<text x="8" y="16" fill="#102033" font-size="13" font-family="DejaVu Sans, Liberation Sans, Helvetica, sans-serif" font-weight="700">${xml(input.view.toUpperCase())}</text>`,
  );
  for (const mark of input.plan.marks) {
    texts.push(
      `<text x="${mark.x.toFixed(1)}" y="${mark.y.toFixed(1)}" fill="#102033" stroke="#ffffff" stroke-width="3" paint-order="stroke" font-size="12" font-family="DejaVu Sans, Liberation Sans, Helvetica, sans-serif">${xml(mark.id)}</text>`,
    );
  }
  const lines = legendLines(input.plan, input.generation);
  lines.forEach((line, i) => {
    const y = input.modelHeight + 16 + i * 14;
    if (y < input.height) {
      texts.push(
        `<text x="8" y="${y}" fill="#102033" font-size="11" font-family="DejaVu Sans, Liberation Sans, Helvetica, sans-serif">${xml(line)}</text>`,
      );
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}">${texts.join('')}</svg>`;
}

export function legendBandHeight(): number {
  return LEGEND_HEIGHT;
}
