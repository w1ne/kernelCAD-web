// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useContext, type ReactNode } from 'react';

export interface StudioChromeValue {
  /** Extra chrome injected into the Header's left cluster, after the
   * project-manager button. Used by funnel routes to show prompt context
   * or saved-project metadata inline with the Studio chrome. */
  headerLeft?: ReactNode;
  /** Extra chrome injected into the Header's right cluster, before the
   * built-in toolbar group. Used by funnel routes for Save / Sign in. */
  headerRight?: ReactNode;
  /** Read-only live review mode for funnel project pages (/p/<slug>): code
   * editor read-only, built-in agent rail hidden — the model is driven by
   * an external agent, not authored here. */
  viewerMode?: boolean;
}

const StudioChromeContext = createContext<StudioChromeValue>({});

export function StudioChromeProvider({
  value,
  children,
}: {
  value: StudioChromeValue;
  children: ReactNode;
}) {
  return <StudioChromeContext.Provider value={value}>{children}</StudioChromeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudioChrome(): StudioChromeValue {
  return useContext(StudioChromeContext);
}
