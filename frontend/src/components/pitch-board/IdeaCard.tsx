import React from 'react';
import Link from 'next/link';
import { Idea } from '@/types';
import { Tag } from '@/components/ui/Tag';
import { IconBookmark, IconMessage, IconThumbsUp } from '@/components/ui/Icons';

interface IdeaCardProps {
  idea: Idea;
  commentCount?: number;
  isPreview?: boolean;
}

function getStageBadgeConfig(stage: Idea['stage']) {
  switch (stage) {
    case 'MVP':
      return {
        label: 'MVP live',
        dotColor: 'bg-[#16a34a]',
      };
    case 'Prototype':
      return {
        label: 'Prototype',
        dotColor: 'bg-[#f59e0b]',
      };
    case 'Traction':
      return {
        label: 'Traction',
        dotColor: 'bg-[#00adcc]',
      };
    case 'Idea':
    default:
      return {
        label: 'Idea stage',
        dotColor: 'bg-[#7403f4]',
      };
  }
}

export function IdeaCard({ idea, commentCount = 0, isPreview = false }: IdeaCardProps) {
  const stageBadge = getStageBadgeConfig(idea.stage);
  const founderName = idea.isAnonymous ? 'Anonymous founder' : idea.founder.name;
  const founderInitials = idea.isAnonymous ? '?' : idea.founder.initials;

  const cardInner = (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-[16px] border border-[#e4e9f0] bg-white transition-all duration-200 ${
        isPreview
          ? 'shadow-card'
          : 'shadow-card hover:-translate-y-[3px] hover:border-[#4865ff]/40 hover:shadow-card-hover'
      }`}
    >
      {/* Top 200px Cover Area */}
      <div
        className="relative h-[200px] w-full overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgb(15, 27, 45) 0%, rgb(26, 47, 74) 55%, rgb(14, 79, 99) 100%)',
        }}
      >
        {idea.coverImage ? (
          <img
            src={idea.coverImage}
            alt={idea.title || 'Idea cover'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-2 flex h-[44px] w-[44px] items-center justify-center rounded-[12px] bg-white/10 backdrop-blur-sm">
              <img
                src="/assets/logo-primary.svg"
                alt=""
                className="h-[26px] w-[26px] object-contain brightness-200"
              />
            </div>
            <p className="line-clamp-1 font-display text-[16px] font-bold text-white/95">
              {idea.title || 'Your idea title'}
            </p>
            <span className="mt-1 font-sans text-[12px] text-white/65">
              EDISON UPM · {idea.industries[0] || 'Green Tech'}
            </span>
          </div>
        )}

        {/* Top-left Stage Pill */}
        <div className="absolute left-[14px] top-[14px] inline-flex items-center gap-[6px] rounded-full bg-[#0f1b2d]/75 px-[10px] py-[4px] backdrop-blur-md">
          <span className={`h-[6px] w-[6px] rounded-full ${stageBadge.dotColor}`} />
          <span className="font-sans text-[11px] font-semibold leading-[14px] text-white">
            {stageBadge.label}
          </span>
        </div>

        {/* Top-right Bookmark Button */}
        <div
          className="absolute right-[14px] top-[14px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white/90 text-[#0f1b2d] shadow-sm backdrop-blur-sm transition-colors group-hover:bg-white"
          aria-hidden="true"
        >
          <IconBookmark size={15} />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-[20px]">
        <div>
          {/* Industry Tags */}
          <div className="mb-[10px] flex flex-wrap items-center gap-[6px]">
            {(idea.industries.length > 0 ? idea.industries : (['Green Tech'] as const)).map(
              (category) => (
                <Tag key={category} category={category} />
              )
            )}
          </div>

          {/* Title */}
          <h3 className="mb-[6px] font-display text-[20px] font-bold leading-[26px] tracking-[-0.3px] text-[#0f1b2d] transition-colors group-hover:text-[#4865ff]">
            {idea.title || 'Untitled idea'}
          </h3>

          {/* Elevator Pitch */}
          <p className="line-clamp-2 font-sans text-[14px] font-normal leading-[20px] text-[#334155]">
            {idea.elevatorPitch ||
              'Your crisp one-sentence elevator pitch will appear right here on the Pitch Board card.'}
          </p>
        </div>

        {/* Card Footer */}
        <div className="mt-[16px] flex items-center justify-between border-t border-[#e4e9f0] pt-[12px]">
          <div className="flex items-center gap-[10px]">
            <div
              className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, rgb(72, 101, 255) 0%, rgb(0, 173, 204) 100%)',
              }}
            >
              {founderInitials}
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-[13px] font-semibold leading-[17px] text-[#0f1b2d]">
                {founderName}
              </span>
              <span className="font-sans text-[11px] font-normal leading-[14px] text-[#64748b]">
                {idea.isAnonymous ? 'Identity hidden' : idea.founder.schoolAndYear}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-[12px] text-[#64748b]">
            <span className="inline-flex items-center gap-[4px] font-sans text-[12px] font-semibold text-[#64748b]">
              <IconMessage size={14} />
              <span>{commentCount}</span>
            </span>
            <span className="inline-flex items-center gap-[4px] font-sans text-[12px] font-semibold text-[#64748b]">
              <IconThumbsUp size={14} />
              <span>{idea.helpfulCount}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );

  if (isPreview) {
    return cardInner;
  }

  return (
    <Link href={`/ideas/${idea.slug}`} className="block h-full focus:outline-none">
      {cardInner}
    </Link>
  );
}
