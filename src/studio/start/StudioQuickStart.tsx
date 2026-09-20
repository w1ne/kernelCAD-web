// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useStudioChrome } from '../context/StudioChromeContext';
import { shellStore } from '../store/shellStore';
import { useWorkbench } from '../context/WorkbenchContext';
import { STARTERS, studioStarterCode, type StarterModel } from './starterModels';

export function StudioQuickStart() {
  const { createProject, saveActiveProject } = useProject();
  const { code } = useWorkbench();
  const { viewerMode } = useStudioChrome();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  // Source links and embedded review pages must keep their supplied model.
  const sourceLink = new URLSearchParams(window.location.search);
  if (viewerMode || ['script', 'gallery', 'headless'].some(key => sourceLink.has(key))) return null;

  const start = (model: StarterModel) => {
    // Persist any pending editor autosave before switching to a new project.
    saveActiveProject({ code });
    createProject(model.name, studioStarterCode(model));
    shellStore.setInspectorOpen(true);
    setMessage('Change size in Params. Download in Export.');
  };

  return (
    <section aria-label="Quick start" className="shrink-0 border-b border-[#333] bg-[#161616] px-3 py-2 text-xs text-gray-300">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="rounded border border-[#444] px-3 py-1 hover:bg-[#252525]">Quick start</button>
        {open && <>
          {STARTERS.map(model => <button key={model.id} type="button" onClick={() => start(model)} className="rounded px-2 py-1 hover:bg-[#252525]">{model.name}</button>)}
          <span role="status" className="text-gray-400">{message || 'Pick a part to open a new project.'}</span>
        </>}
      </div>
    </section>
  );
}
