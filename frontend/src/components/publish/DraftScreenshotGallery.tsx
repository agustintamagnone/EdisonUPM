'use client';

import { useState } from 'react';
import type { Attachment } from '@/types';
import { IconClose } from '@/components/ui/Icons';
import { apiUrl } from '@/utils/api';

interface DraftScreenshotGalleryProps {
  screenshots: Attachment[];
  onRemove: (id: string) => void;
}

function ScreenshotImage({ screenshot, className, decorative }: { screenshot: Attachment; className: string; decorative?: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable) return <span className={`flex items-center justify-center bg-[#f4f7fa] px-2 text-center text-xs text-[#64748b] ${className}`}>Screenshot unavailable</span>;
  // Use the browser session directly when requesting a draft attachment.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={apiUrl(screenshot.url)} alt={decorative ? '' : screenshot.fileName} onError={() => setUnavailable(true)} className={className} />;
}

export function DraftScreenshotGallery({ screenshots, onRemove }: DraftScreenshotGalleryProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const selected = screenshots.find((screenshot) => screenshot.id === selectedId) ?? screenshots[0];
  if (!selected) return null;

  return (
    <div className="mt-3 space-y-3">
      <figure className="overflow-hidden rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa]">
        <ScreenshotImage key={selected.id} screenshot={selected} className="h-[220px] w-full object-contain sm:h-[280px]" />
        <figcaption className="break-words px-3 py-2 text-xs text-[#334155]">{selected.fileName}</figcaption>
      </figure>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {screenshots.map((screenshot, index) => (
          <div key={screenshot.id} className="relative min-w-0">
            <button type="button" aria-pressed={selected.id === screenshot.id}
              aria-label={`Preview screenshot ${index + 1}: ${screenshot.fileName}`}
              onClick={() => setSelectedId(screenshot.id)}
              className={`block w-full overflow-hidden rounded-[10px] border-2 focus-visible:outline-[#4865ff] ${selected.id === screenshot.id ? 'border-[#4865ff]' : 'border-transparent hover:border-[#cbd5e1]'}`}>
              <ScreenshotImage screenshot={screenshot} className="h-[88px] w-full object-cover" decorative />
            </button>
            <button type="button" aria-label={`Remove ${screenshot.fileName}`} onClick={() => onRemove(screenshot.id)}
              className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#0f1b2d]/80 text-white hover:bg-[#0f1b2d] focus-visible:ring-2 focus-visible:ring-[#4865ff]">
              <IconClose size={14} />
            </button>
            <span className="mt-1 block truncate text-[11px] text-[#64748b]">{screenshot.fileName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
