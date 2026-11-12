import React from 'react';
import { IndustryCategory } from '@/types';

interface TagProps {
  category: IndustryCategory;
  className?: string;
}

const TAG_STYLES: Record<
  IndustryCategory,
  { bg: string; text: string; dot: string }
> = {
  'Green Tech': {
    bg: 'bg-[#e7f6ec]',
    text: 'text-[#15803d]',
    dot: 'bg-[#16a34a]',
  },
  Software: {
    bg: 'bg-[#e5f7fa]',
    text: 'text-[#00869e]',
    dot: 'bg-[#00adcc]',
  },
  Hardware: {
    bg: 'bg-[#ffedd5]',
    text: 'text-[#c2410c]',
    dot: 'bg-[#f97316]',
  },
  HealthTech: {
    bg: 'bg-[#fce7f3]',
    text: 'text-[#be185d]',
    dot: 'bg-[#ec4899]',
  },
  EdTech: {
    bg: 'bg-[#f2e8ff]',
    text: 'text-[#6d28d9]',
    dot: 'bg-[#7403f4]',
  },
  'Circular Economy': {
    bg: 'bg-[#ccfbf1]',
    text: 'text-[#0f766e]',
    dot: 'bg-[#0d9488]',
  },
  AgriTech: {
    bg: 'bg-[#ecfccb]',
    text: 'text-[#4d7c0f]',
    dot: 'bg-[#65a30d]',
  },
};

export function Tag({ category, className = '' }: TagProps) {
  const style = TAG_STYLES[category] ?? TAG_STYLES['Green Tech'];

  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] font-sans text-[12px] font-semibold leading-[16px] ${style.bg} ${style.text} ${className}`}
    >
      <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${style.dot}`} />
      <span>{category}</span>
    </span>
  );
}
