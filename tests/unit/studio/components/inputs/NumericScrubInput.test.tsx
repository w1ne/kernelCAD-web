// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NumericScrubInput } from '../../../../../src/studio/components/inputs/NumericScrubInput';

afterEach(() => cleanup());

describe('NumericScrubInput', () => {
  it('renders the current value in the editable input', () => {
    render(<NumericScrubInput name="width" value={50} onChange={() => {}} />);
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('emits onChange when input is edited and blurred', () => {
    const onChange = vi.fn();
    render(<NumericScrubInput name="width" value={50} onChange={onChange} />);
    const input = screen.getByDisplayValue('50') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('emits onChange when slider is moved', () => {
    const onChange = vi.fn();
    render(<NumericScrubInput name="width" value={50} min={0} max={100} onChange={onChange} />);
    const slider = screen.getByTestId('scrub-slider-width') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('clamps values outside [min, max] when committing', () => {
    const onChange = vi.fn();
    render(<NumericScrubInput name="width" value={50} min={0} max={100} onChange={onChange} />);
    // When min/max are set, both number-input and range-slider render with value=50,
    // so getByDisplayValue is ambiguous — disambiguate via testid.
    const input = screen.getByTestId('scrub-input-width') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('renders unit suffix when provided', () => {
    render(<NumericScrubInput name="angle" value={15} unit="°" onChange={() => {}} />);
    expect(screen.getByText('°')).toBeInTheDocument();
  });

  it('renders limit marks on the slider track', () => {
    const { container } = render(
      <NumericScrubInput
        name="shoulder"
        value={15}
        min={-30}
        max={110}
        unit="°"
        limitMarks={[
          { at: -30, label: 'lo' },
          { at: 110, label: 'hi' },
        ]}
        onChange={() => {}}
      />
    );
    expect(container.querySelector('[title="lo"]')).not.toBeNull();
    expect(container.querySelector('[title="hi"]')).not.toBeNull();
  });
});
