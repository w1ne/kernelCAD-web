// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * One customizer row per parameter type: a slider with a number field and
 * unit (number), a switch (boolean), a segmented control or a list (choice),
 * and a text field (string). Every row has a readable label and, once its
 * value leaves the saved default, a reset button.
 */
import { useId, useState, type JSX, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { IconButton, NumberInput, Slider, cx } from '../../ui';
import { formatNumber } from '../../ui/numberModel';
import type { ParamValue } from '../../shared/runtime/paramTable';
import { checkParamValue, type CustomizerParam } from './customizerParams';

export interface ParamRowProps {
  param: CustomizerParam;
  value: ParamValue;
  /** A value edit; the caller debounces the rebuild. */
  onChange: (value: ParamValue) => void;
  /** The edit is done (release, Enter, blur): rebuild now. */
  onCommit: () => void;
  onReset: () => void;
}

/** Choices shown as a segmented control; longer lists use a menu. */
const MAX_SEGMENTS = 4;
const MAX_SEGMENT_LENGTH = 10;

function defaultText(param: CustomizerParam): string {
  const value = param.defaultValue;
  if (typeof value === 'number') return `${formatNumber(value, param.step)}${param.unit ? ` ${param.unit}` : ''}`;
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  return value === '' ? 'empty' : value;
}

function ResetButton({ param, changed, onReset }: { param: CustomizerParam; changed: boolean; onReset: () => void }) {
  // The slot keeps its width when hidden, so the value does not jump.
  if (!changed) return <span aria-hidden="true" className="size-control-sm shrink-0 max-sm:size-touch" />;
  return (
    <IconButton
      size="sm"
      label={`Reset ${param.label} to ${defaultText(param)}`}
      icon={<RotateCcw className="size-3.5" strokeWidth={1.75} />}
      onClick={onReset}
      data-testid={`customizer-reset-${param.name}`}
      className="shrink-0 max-sm:size-touch"
    />
  );
}

function RowFrame(props: {
  param: CustomizerParam;
  labelId: string;
  changed: boolean;
  onReset: () => void;
  control: ReactNode;
  below?: ReactNode;
}): JSX.Element {
  const { param, labelId, changed } = props;
  return (
    <div data-testid={`customizer-row-${param.name}`} data-changed={changed || undefined} className="px-4 py-2">
      <div className="flex min-h-control-sm items-center gap-2">
        <div className="min-w-0 flex-1">
          <span id={labelId} className="block truncate text-ui text-fg" title={param.label === param.name ? undefined : param.name}>
            {param.label}
          </span>
          {param.description && (
            <span className="block truncate text-2xs text-fg-3" title={param.description}>{param.description}</span>
          )}
        </div>
        <ResetButton param={param} changed={changed} onReset={props.onReset} />
        {props.control}
      </div>
      {props.below}
    </div>
  );
}

function NumberRow({ param, value, onChange, onCommit, onReset }: ParamRowProps & { value: number }): JSX.Element {
  const labelId = useId();
  const range = param.range ?? { min: param.min ?? 0, max: param.max ?? Math.max(1, value * 2) };
  const step = param.step ?? 1;
  return (
    <RowFrame
      param={param}
      labelId={labelId}
      changed={value !== param.defaultValue}
      onReset={onReset}
      control={(
        <div data-testid={`customizer-number-${param.name}`} className="w-28 shrink-0">
          <NumberInput
            value={value}
            onChange={(next) => { onChange(next); onCommit(); }}
            min={param.min}
            max={param.max}
            step={step}
            unit={param.unit}
            aria-labelledby={labelId}
          />
        </div>
      )}
      below={(
        <div data-testid={`customizer-slider-${param.name}`} className="max-sm:py-1.5">
          <Slider
            value={value}
            onChange={onChange}
            onCommit={onCommit}
            // A typed value past a derived end moves the end with it.
            min={Math.min(range.min, value)}
            max={Math.max(range.max, value)}
            step={step}
            unit={param.unit}
            defaultValue={param.defaultValue as number}
            aria-labelledby={labelId}
          />
        </div>
      )}
    />
  );
}

function BooleanRow({ param, value, onChange, onCommit, onReset }: ParamRowProps & { value: boolean }): JSX.Element {
  const labelId = useId();
  return (
    <RowFrame
      param={param}
      labelId={labelId}
      changed={value !== param.defaultValue}
      onReset={onReset}
      control={(
        <label className="relative inline-flex h-control-sm shrink-0 cursor-pointer items-center max-sm:h-touch">
          <input
            type="checkbox"
            role="switch"
            checked={value}
            onChange={(e) => { onChange(e.target.checked); onCommit(); }}
            aria-labelledby={labelId}
            data-testid={`customizer-toggle-${param.name}`}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="h-5 w-9 rounded-full border border-border-strong bg-surface-3 transition-colors duration-80 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          />
          <span
            aria-hidden="true"
            className="absolute left-0.5 size-4 rounded-full bg-fg-2 shadow-e1 transition-transform duration-80 peer-checked:translate-x-4 peer-checked:bg-on-accent"
          />
        </label>
      )}
    />
  );
}

function Segmented({ param, value, labelId, onPick }: {
  param: CustomizerParam;
  value: string;
  labelId: string;
  onPick: (choice: string) => void;
}): JSX.Element {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      data-testid={`customizer-select-${param.name}`}
      className="flex shrink-0 rounded-control border border-border-strong bg-surface-2 p-0.5"
    >
      {(param.choices ?? []).map((choice) => (
        <label key={choice} className="relative">
          <input
            type="radio"
            name={group}
            value={choice}
            checked={choice === value}
            onChange={() => onPick(choice)}
            data-testid={`customizer-option-${param.name}-${choice}`}
            className="peer sr-only"
          />
          <span className="flex h-6 cursor-pointer items-center rounded-[3px] px-2 text-ui text-fg-2 transition-colors duration-80 hover:text-fg peer-checked:bg-surface-1 peer-checked:text-fg peer-checked:shadow-e1 peer-focus-visible:outline-2 peer-focus-visible:outline-accent max-sm:h-9">
            {choice}
          </span>
        </label>
      ))}
    </div>
  );
}

const FIELD = 'h-control-sm rounded-control border border-border-strong bg-surface-1 px-2 text-ui text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function ChoiceRow({ param, value, onChange, onCommit, onReset }: ParamRowProps & { value: string }): JSX.Element {
  const labelId = useId();
  const choices = param.choices ?? [];
  const pick = (choice: string) => { onChange(choice); onCommit(); };
  const segmented = choices.length <= MAX_SEGMENTS && choices.every((c) => c.length <= MAX_SEGMENT_LENGTH);
  return (
    <RowFrame
      param={param}
      labelId={labelId}
      changed={value !== param.defaultValue}
      onReset={onReset}
      control={segmented ? (
        <Segmented param={param} value={value} labelId={labelId} onPick={pick} />
      ) : (
        <select
          value={value}
          onChange={(e) => pick(e.target.value)}
          aria-labelledby={labelId}
          data-testid={`customizer-select-${param.name}`}
          className={cx(FIELD, 'max-w-40 shrink-0')}
        >
          {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select>
      )}
    />
  );
}

function TextRow({ param, value, onChange, onCommit, onReset }: ParamRowProps & { value: string }): JSX.Element {
  const labelId = useId();
  const [draft, setDraft] = useState(value);
  // Follow outside changes (Reset) without dropping an invalid draft mid-typing.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  const valid = checkParamValue(param, draft).ok;
  return (
    <RowFrame
      param={param}
      labelId={labelId}
      changed={value !== param.defaultValue}
      onReset={onReset}
      control={(
        <input
          type="text"
          value={draft}
          maxLength={param.maxLength}
          onChange={(e) => {
            setDraft(e.target.value);
            if (checkParamValue(param, e.target.value).ok) onChange(e.target.value);
          }}
          onBlur={onCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') onCommit(); }}
          aria-labelledby={labelId}
          aria-invalid={!valid || undefined}
          data-testid={`customizer-text-${param.name}`}
          className={cx(FIELD, 'w-32 shrink-0 aria-invalid:border-danger')}
        />
      )}
    />
  );
}

export function ParamRow(props: ParamRowProps): JSX.Element | null {
  const { param, value } = props;
  if (param.type === 'number' && typeof value === 'number') return <NumberRow {...props} value={value} />;
  if (param.type === 'boolean' && typeof value === 'boolean') return <BooleanRow {...props} value={value} />;
  if (param.type === 'choice' && typeof value === 'string') return <ChoiceRow {...props} value={value} />;
  if (param.type === 'string' && typeof value === 'string') return <TextRow {...props} value={value} />;
  return null;
}
