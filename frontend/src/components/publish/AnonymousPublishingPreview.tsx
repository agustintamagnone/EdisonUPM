'use client';

import { useId } from 'react';

export type AnonymousPreviewMode = 'off' | 'anonymous' | 'revealed';

export const anonymousPreviewAuthor = {
  name: 'Anonymous Founder',
  initials: '?',
  description: 'Identity hidden in this demo',
};

interface AnonymousPublishingPreviewProps {
  mode: AnonymousPreviewMode;
  authorName: string;
  onChange: (mode: AnonymousPreviewMode) => void;
}

export function AnonymousPublishingPreview({ mode, authorName, onChange }: AnonymousPublishingPreviewProps) {
  const explanationId = useId();
  const active = mode !== 'off';

  return (
    <section className="mt-6 rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] p-4">
      <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-[#0f1b2d]">
        <input type="checkbox" checked={active} aria-describedby={explanationId}
          onChange={(event) => onChange(event.target.checked ? 'anonymous' : 'off')}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-[#4865ff] focus:ring-[#4865ff]" />
        <span>Publish anonymously <span className="font-medium text-[#64748b]">(demo only)</span></span>
      </label>
      <p id={explanationId} className="mt-2 text-xs leading-5 text-[#334155]">
        Anonymous publishing is unavailable. This control changes the preview only. Publishing displays your name.
      </p>
      {active && (
        <div className="mt-3 rounded-[10px] border border-[#e4e9f0] bg-white p-3">
          <p aria-live="polite" className="break-words text-sm text-[#334155]">
            Preview author <strong className="text-[#0f1b2d]">{mode === 'anonymous' ? anonymousPreviewAuthor.name : authorName}</strong>
          </p>
          <button type="button" onClick={() => onChange(mode === 'anonymous' ? 'revealed' : 'anonymous')}
            className="mt-2 inline-flex min-h-10 items-center rounded-[8px] border border-[#e4e9f0] px-3 text-xs font-semibold text-[#4865ff] hover:bg-[#e8ebfe] focus-visible:outline-[#4865ff]">
            {mode === 'anonymous' ? 'Reveal my identity (demo)' : 'Hide my identity again (demo)'}
          </button>
          <p className="mt-2 text-xs text-[#64748b]">Turn off the demo to publish with your name.</p>
        </div>
      )}
    </section>
  );
}
