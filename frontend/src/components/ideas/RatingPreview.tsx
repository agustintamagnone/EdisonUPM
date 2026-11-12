'use client';

import { useId, useState } from 'react';

const stars = [1, 2, 3, 4, 5] as const;
export type StarRating = (typeof stars)[number];

interface StarRatingInputProps {
  value: StarRating | null;
  onChange: (value: StarRating) => void;
  descriptionId?: string;
}

export function StarRatingInput({ value, onChange, descriptionId }: StarRatingInputProps) {
  const name = useId();

  return (
    <fieldset aria-describedby={descriptionId} className="min-w-0">
      <legend className="sr-only">Select a rating from 1 to 5 stars</legend>
      <div className="flex flex-wrap gap-1">
        {stars.map((star) => {
          const filled = value !== null && star <= value;
          return (
            <label key={star} className="relative block cursor-pointer">
              <input type="radio" className="peer sr-only" name={name} value={star}
                checked={value === star} onChange={() => onChange(star)} />
              <span className={`flex h-11 w-11 items-center justify-center rounded-[10px] border transition-colors hover:border-[#4865ff] peer-focus-visible:ring-2 peer-focus-visible:ring-[#3144aa] peer-focus-visible:ring-offset-1 ${filled
                ? 'border-[#e6c400] bg-[#fff7da] text-[#8a5b00]'
                : 'border-[#e4e9f0] bg-white text-[#64748b]'}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill={filled ? '#e6c400' : 'none'}
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z" />
                </svg>
                <span className="sr-only">{star} {star === 1 ? 'star' : 'stars'}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function RatingPreview() {
  const descriptionId = useId();
  const [value, setValue] = useState<StarRating | null>(null);

  return (
    <section aria-label="Rating preview" className="rounded-[16px] border border-[#e4e9f0] bg-white p-4 shadow-card sm:p-[28px]">
      <h2 className="font-display text-[20px] font-bold text-[#0f1b2d]">Rate this idea <span className="text-sm font-semibold text-[#4865ff]">(preview)</span></h2>
      <p id={descriptionId} className="mb-3 mt-1 text-sm leading-5 text-[#64748b]">
        Try selecting a rating. Preview ratings are not saved or shared.
      </p>
      <StarRatingInput value={value} onChange={setValue} descriptionId={descriptionId} />
      <p role="status" className="mt-2 min-h-5 text-xs font-semibold text-[#334155]">
        {value !== null && `Preview selection: ${value} of 5 stars`}
      </p>
    </section>
  );
}
