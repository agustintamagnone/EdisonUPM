import React from 'react';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Chip({
  label,
  selected = false,
  onClick,
  className = '',
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full px-[14px] py-[8px] font-sans text-[13px] transition-all duration-150 ${
        selected
          ? 'bg-[#0f1b2d] font-semibold text-white shadow-sm'
          : 'border border-[#e4e9f0] bg-white font-medium text-[#334155] hover:border-[#4865ff] hover:bg-[#e8ebfe] hover:text-[#4865ff]'
      } ${className}`}
    >
      {label}
    </button>
  );
}
