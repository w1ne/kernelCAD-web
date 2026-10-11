// SPDX-License-Identifier: MIT
import { useContext, useState } from 'react';
import { ProjectContext, isEphemeralProjectId } from '../context/ProjectContext';
import { DraftingSettingsSchema, type DraftingSettings } from '../../authoring/draftingSettings';
import { currentHostedProject } from '../scriptSource';

/** Local projects carry choices in their .kcad JSON. Share-page choices are
 * private to this browser and revision; they never change the published model. */
export function useDraftingPreferences() {
  const project = useContext(ProjectContext);
  const hosted = currentHostedProject();
  const key = hosted ? `kernelcad.drafting.project:${hosted.slug}@${hosted.version ?? 'latest'}` : null;
  const [, setRevision] = useState(0);
  const stored = (() => {
    if (!key) return undefined;
    try { const value = DraftingSettingsSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null')); return value.success ? value.data as DraftingSettings : undefined; }
    catch { return undefined; }
  })();
  const settings = project?.activeProject?.drafting ?? stored;
  const save = (drafting: DraftingSettings) => {
    project?.saveActiveProject({ drafting });
    if (key && (!project || isEphemeralProjectId(project.activeProjectId))) {
      try { localStorage.setItem(key, JSON.stringify(drafting)); setRevision((r) => r + 1); } catch { /* memory choices remain usable */ }
    }
  };
  return { settings, save };
}
