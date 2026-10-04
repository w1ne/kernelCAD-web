// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Requests that commands (the palette today, toolbars later) send to views
// that own their state locally: the viewer's camera and the inspector's
// active tab. A request is fire-and-forget; the mounted view applies it.
import { useEffect, useRef } from 'react';
import type { ViewTarget } from '../components/viewer/controllers/cameraPose';
import type { TabId } from '../types';

type Listener<T> = (value: T) => void;

class RequestChannel<T> {
    private readonly listeners = new Set<Listener<T>>();

    request(value: T): void {
        for (const listener of this.listeners) listener(value);
    }

    subscribe(listener: Listener<T>): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}

/** Camera presets and "fit": the viewer moves its camera. */
export const viewTargetRequests = new RequestChannel<ViewTarget>();

/** Inspector tab switches: the inspector shows that tab. */
export const inspectorTabRequests = new RequestChannel<TabId>();

function useChannel<T>(channel: RequestChannel<T>, onRequest: Listener<T>): void {
    const latest = useRef(onRequest);
    useEffect(() => {
        latest.current = onRequest;
    });
    useEffect(() => channel.subscribe((value) => latest.current(value)), [channel]);
}

export function useViewTargetRequests(onRequest: Listener<ViewTarget>): void {
    useChannel(viewTargetRequests, onRequest);
}

export function useInspectorTabRequests(onRequest: Listener<TabId>): void {
    useChannel(inspectorTabRequests, onRequest);
}
