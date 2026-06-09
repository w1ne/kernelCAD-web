import type { ReactNode } from 'react';

/** Payload emitted by the paint-a-review (brush) flow inside the Studio
 *  viewport. Mirrors the body that `MarkingOverlay` POSTs to the standalone
 *  save server today: a screenshot of the viewport at marking time, a mask
 *  PNG of the painted regions, and metadata about the strike. When a host
 *  embeds Studio (e.g. proto.cat) it supplies `onBrushReport` to receive
 *  this payload directly instead of going over HTTP.
 */
export interface BrushReport {
    /** Base64-encoded PNG of the viewport at the moment of save. Empty
     *  string when the renderer canvas was unavailable. */
    screenshot: string;
    /** Base64-encoded PNG of the paint mask (same dimensions as screenshot). */
    mask: string;
    meta: {
        ts: string;
        ua: string;
        screenshotMissing: boolean;
        struckParts: unknown;
        raycastDebug: unknown;
        /** Optional free-text note. Empty string today; reserved for a
         *  future "Send with note" UI. */
        note?: string;
        /** The `?script=` URL parameter at mark time, if any. Standalone
         *  Studio uses this to associate a mark with a gallery script;
         *  embed hosts can ignore. */
        scriptPath?: string | null;
        /** Forwards-compatible: hosts MAY find additional fields here. */
        [extra: string]: unknown;
    };
}

/** Embed-time configuration for Studio. Provided by `StudioConfigProvider`.
 *  All fields are optional; defaults preserve the standalone-app behavior. */
export interface StudioConfig {
    /** URL prefix for `/__kernelcad/*` fetches. When set, takes precedence
     *  over `VITE_API_BASE_URL` / `VITE_KERNELCAD_API_BASE`. Empty string
     *  (the default) keeps fetches same-origin, hitting the existing vite
     *  middleware in standalone dev. */
    backendUrl?: string;
    /** Render the kernelCAD `<Header />` chrome at the top of the shell.
     *  Default true (standalone). Hosts embed Studio with `false` and use
     *  the `chrome` slots below to inject their own header. */
    showHeader?: boolean;
    /** Mount the `<AgentRail />` and its toolbar toggle. Default true
     *  (standalone). Hosts that drive the agent themselves embed with
     *  `false`. */
    enableAgentRail?: boolean;
    /** Render the "Connect to Claude Desktop" link in the toolbar.
     *  Default true (standalone). The target route (`/connect`) only
     *  exists in the standalone kernelcad.app deploy, so hosts hide it
     *  to avoid a dead link inside their own routing. */
    enableConnect?: boolean;
    /** Optional header chrome slots, forwarded to `StudioChromeProvider`
     *  so funnel-style host integrations can still render header content
     *  when `showHeader` is false. */
    chrome?: { headerLeft?: ReactNode; headerRight?: ReactNode };
    /** Receives the latest `.kcad.ts` source after every Studio-side
     *  mutation. Debounced ~150ms. When set together with a `code` prop
     *  on `<StudioApp>`, Studio enters controlled mode and the host owns
     *  the canonical source string. */
    onCodeChange?: (next: string) => void;
    /** Receives the brush / paint-a-review payload when the user finishes
     *  a mark. When set, the embed callback fires and Studio skips its
     *  built-in HTTP POST to the standalone save server. */
    onBrushReport?: (report: BrushReport) => void;
}
