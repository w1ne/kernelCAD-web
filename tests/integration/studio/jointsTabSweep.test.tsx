/** @vitest-environment jsdom */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JointsTab } from '../../../src/studio/tabs/JointsTab';
import * as useRecomputeResultModule from '../../../src/studio/hooks/useRecomputeResult';
import type { JointPoseSnapshot } from '../../../src/studio/adapters/featureRecordsToMates';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function snapshot(partial: Partial<JointPoseSnapshot> & { name?: string }): JointPoseSnapshot {
    return {
        mate: {
            name: partial.name ?? 'shoulder',
            a: 'base.connA',
            b: 'arm.connB',
            type: 'revolute',
            limitsDeg: [-30, 110] as const,
            ...(partial.mate ?? {}),
        },
        pose: partial.pose ?? 15,
        poseParamNames: partial.poseParamNames ?? [partial.name ?? 'shoulder'],
        ...(partial.preview !== undefined ? { preview: partial.preview } : {}),
    };
}

describe('JointsTab joint slider sweep', () => {
    it('renders one slider per posed mate and updates pose on drag', async () => {
        const updateMock = vi.fn().mockResolvedValue(undefined);
        const transformMock = vi.fn();
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [
                { faces: [], assemblyPartName: 'base', transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
                { faces: [], assemblyPartName: 'arm', transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 10, 1] },
            ],
            validity: null,
            paramTable: null,
            diagnostics: [],
            recomputeMs: 0,
            joints: [snapshot({
                name: 'shoulder',
                pose: 15,
                preview: {
                    assemblyFeatureId: 'asm',
                    parentPartName: 'base',
                    childPartName: 'arm',
                    parentConnectorOrigin: [0, 0, 0],
                    parentConnectorAxis: [0, 0, 1],
                },
            })],
            updateParam: updateMock,
            setGeometryTransformOverride: transformMock,
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<JointsTab />);
        const slider = screen.getByTestId('scrub-slider-shoulder') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '45' } });
        expect(transformMock).toHaveBeenCalledWith('arm', expect.arrayContaining([
            expect.any(Number),
        ]));
        await waitFor(() =>
            expect(updateMock).toHaveBeenCalledWith([{ name: 'shoulder', value: 45 }]),
        );
    });

    it('renders empty state when no joints with pose', () => {
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: null,
            diagnostics: [],
            recomputeMs: 0,
            joints: [],
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<JointsTab />);
        expect(screen.getByTestId('joints-empty-state')).toBeTruthy();
    });

    it('reset-all-to-rest sets every joint pose to 0', async () => {
        const updateMock = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: null,
            diagnostics: [],
            recomputeMs: 0,
            joints: [
                snapshot({ name: 'shoulder', pose: 15 }),
                snapshot({ name: 'elbow', pose: -22.5, poseParamNames: ['elbow'] }),
            ],
            updateParam: updateMock,
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<JointsTab />);
        const resetButton = screen.getByText(/reset all to rest/i);
        fireEvent.click(resetButton);
        await waitFor(() => {
            expect(updateMock).toHaveBeenCalledWith([
                { name: 'shoulder', value: 0 },
                { name: 'elbow', value: 0 },
            ]);
        });
    });

    it('ball joints render three sliders for XYZ Euler components', async () => {
        const updateMock = vi.fn().mockResolvedValue(undefined);
        const ballSnap: JointPoseSnapshot = {
            mate: {
                name: 'wrist',
                a: 'forearm.tip',
                b: 'hand.base',
                type: 'ball',
            },
            pose: [10, 20, 30] as [number, number, number],
            poseParamNames: ['wristX', 'wristY', 'wristZ'],
        };
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: null,
            diagnostics: [],
            recomputeMs: 0,
            joints: [ballSnap],
            updateParam: updateMock,
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<JointsTab />);
        expect(screen.getByTestId('scrub-wristX')).toBeTruthy();
        expect(screen.getByTestId('scrub-wristY')).toBeTruthy();
        expect(screen.getByTestId('scrub-wristZ')).toBeTruthy();
        const yInput = screen.getByTestId('scrub-input-wristY') as HTMLInputElement;
        fireEvent.change(yInput, { target: { value: '55' } });
        fireEvent.blur(yInput);
        await waitFor(() =>
            expect(updateMock).toHaveBeenCalledWith([{ name: 'wristY', value: 55 }]),
        );
    });
});
