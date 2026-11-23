import React from 'react';
import type { IdeaTag } from '@/types';
import { TAG_LABELS } from '@/utils/ideaDisplay';

interface TagProps {
  category: IdeaTag;
  className?: string;
}

const TAG_STYLES: Record<
  IdeaTag,
  { bg: string; text: string; dot: string }
> = {
  GREEN_TECH: {
    bg: 'bg-[#e7f6ec]',
    text: 'text-[#15803d]',
    dot: 'bg-[#16a34a]',
  },
  SOFTWARE: {
    bg: 'bg-[#e5f7fa]',
    text: 'text-[#00869e]',
    dot: 'bg-[#00adcc]',
  },
  HARDWARE: {
    bg: 'bg-[#ffedd5]',
    text: 'text-[#c2410c]',
    dot: 'bg-[#f97316]',
  },
  HEALTH_TECH: {
    bg: 'bg-[#fce7f3]',
    text: 'text-[#be185d]',
    dot: 'bg-[#ec4899]',
  },
  ED_TECH: {
    bg: 'bg-[#f2e8ff]',
    text: 'text-[#6d28d9]',
    dot: 'bg-[#7403f4]',
  },
  CIRCULAR_ECONOMY: {
    bg: 'bg-[#ccfbf1]',
    text: 'text-[#0f766e]',
    dot: 'bg-[#0d9488]',
  },
};

export function Tag({ category, className = '' }: TagProps) {
  const style = TAG_STYLES[category];

  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] font-sans text-[12px] font-semibold leading-[16px] ${style.bg} ${style.text} ${className}`}
    >
      <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${style.dot}`} />
      <span>{TAG_LABELS[category]}</span>
    </span>
  );
}
