// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MovedProjectsNotice } from './-MovedProjectsNotice';
import { movedProjectsText, parseMovedParam } from './-anonClaim';

afterEach(cleanup);

describe('MovedProjectsNotice', () => {
  it('announces how many projects moved to the account', () => {
    render(<MovedProjectsNotice moved={3} />);
    expect(screen.getByRole('status').textContent).toBe('3 projects moved to your account');
  });

  it('uses the singular for one project and a plain line for a repeat claim', () => {
    expect(movedProjectsText(1)).toBe('1 project moved to your account');
    expect(movedProjectsText(0)).toBe('Your projects are already in your account.');
  });

  it('renders nothing without a moved param', () => {
    const { container } = render(<MovedProjectsNotice moved={undefined} />);
    expect(container.textContent).toBe('');
  });

  it('accepts only a small non-negative integer from the URL', () => {
    expect(parseMovedParam('3')).toBe(3);
    expect(parseMovedParam(2)).toBe(2);
    for (const bad of ['', 'abc', '-1', '1.5', undefined, '99999']) expect(parseMovedParam(bad)).toBeUndefined();
  });
});
