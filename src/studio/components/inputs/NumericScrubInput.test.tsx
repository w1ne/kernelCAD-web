/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NumericScrubInput } from './NumericScrubInput';

afterEach(() => cleanup());

describe('NumericScrubInput', () => {
    it('moves the range thumb immediately before the server value updates', () => {
        const onChange = vi.fn();
        render(
            <NumericScrubInput
                name="height-adjust"
                value={0}
                min={0}
                max={34}
                onChange={onChange}
            />,
        );

        const slider = screen.getByTestId('scrub-slider-height-adjust') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '12' } });

        expect(onChange).toHaveBeenCalledWith(12);
        expect(slider.value).toBe('12');
    });

    it('flushes pending edits when the user releases the slider', () => {
        const onCommit = vi.fn();
        render(
            <NumericScrubInput
                name="height-adjust"
                value={0}
                min={0}
                max={34}
                onChange={vi.fn()}
                onCommit={onCommit}
            />,
        );

        fireEvent.pointerUp(screen.getByTestId('scrub-slider-height-adjust'));

        expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it('uses a tall range hit area so the native thumb is not clipped', () => {
        render(
            <NumericScrubInput
                name="height-adjust"
                value={0}
                min={0}
                max={34}
                onChange={vi.fn()}
            />,
        );

        const slider = screen.getByTestId('scrub-slider-height-adjust');
        expect(slider.className).toContain('h-5');
    });
});
