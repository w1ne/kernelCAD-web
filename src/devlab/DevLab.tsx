import { useMemo, useState } from 'react';
import { StudioShell } from '../studio/StudioShell';
import { devLabScenarios } from './scenarios';
import { useWorkbench } from '../context/WorkbenchContext';

function DevLabOverlay() {
  const { setCode, setSelectedFace, setSelectedSketchName } = useWorkbench();
  const scenarios = useMemo(() => devLabScenarios, []);
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');

  const selectedScenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  return (
    <div className="absolute top-3 left-3 z-[1000] rounded-lg border border-[#333] bg-[#111]/90 backdrop-blur px-3 py-2 text-xs text-gray-200 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="font-semibold text-gray-100">Dev Lab</div>
        <a className="text-blue-400 hover:text-blue-300 underline" href="/">Workbench</a>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="text-gray-400" htmlFor="devlab-scenario">Scenario</label>
        <select
          id="devlab-scenario"
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="bg-[#1e1e1e] border border-[#333] rounded px-2 py-1 text-gray-100"
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => {
            setSelectedFace(null);
            setSelectedSketchName(null);
            if (selectedScenario) setCode(selectedScenario.code);
          }}
          title="Load scenario code"
        >
          Load
        </button>
      </div>
      <div className="mt-2 text-[11px] text-gray-400 max-w-[320px]">
        Tip: click a sketch wire to select it, then press <span className="text-gray-200">E</span> to extrude.
      </div>
    </div>
  );
}

export function DevLab() {
  return (
    <div className="w-full h-full relative">
      <StudioShell />
      <DevLabOverlay />
    </div>
  );
}

