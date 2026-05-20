/** @vitest-environment happy-dom */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toolbar } from '../../../src/studio/Toolbar';

afterEach(() => cleanup());

const baseProps = {
  project: { name: 'p' },
  filename: 'f.kcad.ts',
  isModified: false,
  onValidate: () => {},
  onRun: () => {},
  agentRailOpen: false,
  onToggleAgentRail: () => {},
  referenceImagesPresent: false,
  referenceImagesVisible: true,
  onToggleReferenceImages: () => {},
};

describe('Toolbar render-environment slot', () => {
  it('hides the env chip + toggle when no record is present', () => {
    render(<Toolbar {...baseProps}
      renderEnvironmentPresent={false}
      renderEnvironmentVisible={true}
      renderEnvironmentPresetLabel="studio"
      onToggleRenderEnvironment={() => {}}
    />);
    expect(screen.queryByTestId('toolbar-render-environment')).toBeNull();
  });

  it('shows the preset chip + toggle when a record is present', () => {
    const onToggle = vi.fn();
    render(<Toolbar {...baseProps}
      renderEnvironmentPresent={true}
      renderEnvironmentVisible={true}
      renderEnvironmentPresetLabel="studio"
      onToggleRenderEnvironment={onToggle}
    />);
    const btn = screen.getByRole('button', { name: /environment/i });
    expect(btn).toBeTruthy();
    expect(screen.getByText(/studio/i)).toBeTruthy();
  });

  it('reflects disabled state in aria-pressed', () => {
    const onToggle = vi.fn();
    render(<Toolbar {...baseProps}
      renderEnvironmentPresent={true}
      renderEnvironmentVisible={false}
      renderEnvironmentPresetLabel="outdoor"
      onToggleRenderEnvironment={onToggle}
    />);
    const btn = screen.getByRole('button', { name: /enable HDRI environment/i });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('fires onToggleRenderEnvironment when clicked', () => {
    const onToggle = vi.fn();
    render(<Toolbar {...baseProps}
      renderEnvironmentPresent={true}
      renderEnvironmentVisible={true}
      renderEnvironmentPresetLabel="studio"
      onToggleRenderEnvironment={onToggle}
    />);
    fireEvent.click(screen.getByRole('button', { name: /environment/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
