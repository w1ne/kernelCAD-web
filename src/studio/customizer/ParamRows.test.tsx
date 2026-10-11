// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { customizerParamsFrom } from './customizerParams';
import { ParamRow } from './ParamRows';

const [param] = customizerParamsFrom([
  {
    name: 'BodyColor',
    type: 'color',
    value: '#3366cc',
    defaultValue: '#3366cc',
    meta: { label: 'Body colour', description: 'shell paint' },
  },
]);

function setup(value = '#3366cc') {
  const onChange = vi.fn();
  const onCommit = vi.fn();
  const onReset = vi.fn();
  render(<ParamRow param={param} value={value} onChange={onChange} onCommit={onCommit} onReset={onReset} />);
  return { onChange, onCommit, onReset };
}

const swatch = () => screen.getByTestId('customizer-color-BodyColor') as HTMLInputElement;
const hex = () => screen.getByTestId('customizer-hex-BodyColor') as HTMLInputElement;

afterEach(cleanup);

describe('ColorRow', () => {
  it('shows a labelled colour picker and hex field with the description', () => {
    setup();
    expect(swatch().type).toBe('color');
    expect(swatch().value).toBe('#3366cc');
    expect(hex().value).toBe('#3366cc');
    expect(screen.getByLabelText('Body colour')).toBe(swatch());
    expect(screen.getByLabelText('Body colour hex value')).toBe(hex());
    expect(screen.getByText('shell paint')).toBeTruthy();
    expect(screen.queryByTestId('customizer-reset-BodyColor')).toBeNull();
  });

  it('sends a picked colour and rebuilds when the picker closes', () => {
    const { onChange, onCommit } = setup();
    fireEvent.change(swatch(), { target: { value: '#ff8800' } });
    expect(onChange).toHaveBeenCalledWith('#ff8800');
    fireEvent.blur(swatch());
    expect(onCommit).toHaveBeenCalled();
  });

  it('applies a full hex as typed, short forms on Enter, and holds an invalid draft', () => {
    const { onChange, onCommit } = setup();
    fireEvent.change(hex(), { target: { value: '#F80' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(hex(), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#ff8800');
    expect(onCommit).toHaveBeenCalledTimes(1);

    fireEvent.change(hex(), { target: { value: '#00FF00' } });
    expect(onChange).toHaveBeenLastCalledWith('#00ff00');

    onChange.mockClear();
    fireEvent.change(hex(), { target: { value: 'blurple' } });
    fireEvent.blur(hex());
    expect(onChange).not.toHaveBeenCalled();
    expect(hex().getAttribute('aria-invalid')).toBe('true');
  });

  it('offers a reset once the colour leaves its default', () => {
    const { onReset } = setup('#ff8800');
    fireEvent.click(screen.getByTestId('customizer-reset-BodyColor'));
    expect(onReset).toHaveBeenCalled();
  });
});
