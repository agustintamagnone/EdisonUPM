'use client';

import { useState, type FormEvent } from 'react';
import { IconClose, IconLock, IconPlus } from '@/components/ui/Icons';

export const MAX_TRACTION_METRICS = 5;
export const TRACTION_METRIC_MAX_LENGTH = 200;

interface TractionMetricsEditorProps {
  metrics: string[];
  onChange: (metrics: string[]) => void;
  disabled?: boolean;
}

export function TractionMetricsEditor({ metrics, onChange, disabled = false }: TractionMetricsEditorProps) {
  const [input, setInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  function submitMetric(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const metric = input.trim();
    if (!metric) {
      setError('Write a metric before adding it.');
      return;
    }
    if (metric.length > TRACTION_METRIC_MAX_LENGTH) {
      setError(`Each metric must be ${TRACTION_METRIC_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (editingIndex === null && metrics.length >= MAX_TRACTION_METRICS) {
      setError(`You can add up to ${MAX_TRACTION_METRICS} metrics.`);
      return;
    }

    onChange(editingIndex === null
      ? [...metrics, metric]
      : metrics.map((value, index) => index === editingIndex ? metric : value));
    setInput('');
    setEditingIndex(null);
    setError('');
  }

  function editMetric(index: number) {
    setInput(metrics[index]);
    setEditingIndex(index);
    setError('');
  }

  function removeMetric(index: number) {
    onChange(metrics.filter((_, metricIndex) => metricIndex !== index));
    if (editingIndex === index) {
      setInput('');
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    setError('');
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-[#0f1b2d]">
          Traction metrics <span className="font-normal text-[#64748b]">(optional)</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748b]">
          <IconLock size={12} /> Only signed-in users see them
        </span>
      </div>

      {metrics.length > 0 && (
        <ul className="mb-2 space-y-2">
          {metrics.map((metric, index) => (
            <li key={`${index}-${metric}`} className="flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[#e4e9f0] bg-white px-3 py-2">
              <span aria-hidden="true" className="text-[#4865ff]">↗</span>
              <span className="min-w-0 flex-1 break-words text-[13px] text-[#334155]">{metric}</span>
              <button type="button" disabled={disabled} onClick={() => editMetric(index)}
                className="text-xs font-semibold text-[#4865ff] hover:underline disabled:opacity-50">Edit</button>
              <button type="button" disabled={disabled} onClick={() => removeMetric(index)}
                aria-label={`Remove metric ${index + 1}`} className="rounded p-1 text-[#64748b] hover:bg-[#f4f7fa] disabled:opacity-50">
                <IconClose size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(metrics.length < MAX_TRACTION_METRICS || editingIndex !== null) && (
        <form onSubmit={submitMetric} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="traction-metric-input">Write a traction metric</label>
          <input id="traction-metric-input" type="text" maxLength={TRACTION_METRIC_MAX_LENGTH} value={input}
            disabled={disabled} onChange={(event) => { setInput(event.target.value); setError(''); }}
            placeholder="Write a metric, e.g. “3 residences signed a pilot”"
            className="h-[40px] min-w-[180px] flex-1 rounded-[10px] border border-[#e4e9f0] px-3 text-[13px] text-[#0f1b2d] placeholder:text-[#94a3b8] focus:border-[#4865ff] focus:outline-none focus:ring-2 focus:ring-[#4865ff]/15 disabled:bg-[#f4f7fa]" />
          <button type="submit" disabled={disabled || !input.trim()}
            className="inline-flex h-[40px] items-center gap-1 rounded-[10px] border border-[#cbd5e1] bg-white px-3 text-[13px] font-semibold text-[#334155] hover:bg-[#f4f7fa] disabled:opacity-50">
            {editingIndex === null ? <IconPlus size={14} /> : null}
            {editingIndex === null ? 'Add' : 'Save metric'}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      <p className="mt-2 text-[11px] leading-5 text-[#64748b]">
        {metrics.length} / {MAX_TRACTION_METRICS} · Write each metric as a short sentence with a number when possible. Leave this empty if you have no metrics yet.
      </p>
    </div>
  );
}
