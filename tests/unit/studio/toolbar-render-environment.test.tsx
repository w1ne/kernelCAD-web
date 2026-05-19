// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
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
    render(
      <Toolbar
        {...baseProps}
        renderEnvironmentPresent={false}
        renderEnvironmentVisible={true}
        renderEnvironmentPresetLabel="studio"
        onToggleRenderEnvironment={() => {}}
      />,
    );
    expect(screen.queryByTestId('toolbar-render-environment')).toBeNull();
  });

  it('shows the preset chip + toggle when a record is present', () => {
    render(
      <Toolbar
        {...baseProps}
        renderEnvironmentPresent={true}
        renderEnvironmentVisible={true}
        renderEnvironmentPresetLabel="studio"
        onToggleRenderEnvironment={() => {}}
      />,
    );
    const btn = screen.getByTestId('toolbar-render-environment');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toMatch(/studio/);
  });

  it('fires the toggle callback on click', () => {
    const onToggle = vi.fn();
    render(
      <Toolbar
        {...baseProps}
        renderEnvironmentPresent={true}
        renderEnvironmentVisible={true}
        renderEnvironmentPresetLabel="outdoor"
        onToggleRenderEnvironment={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('toolbar-render-environment'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects visible state via aria-pressed', () => {
    render(
      <Toolbar
        {...baseProps}
        renderEnvironmentPresent={true}
        renderEnvironmentVisible={false}
        renderEnvironmentPresetLabel="warehouse"
        onToggleRenderEnvironment={() => {}}
      />,
    );
    expect(screen.getByTestId('toolbar-render-environment')).toHaveAttribute('aria-pressed', 'false');
  });
});
