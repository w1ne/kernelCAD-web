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
});
