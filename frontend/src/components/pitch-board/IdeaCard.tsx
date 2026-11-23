'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { IdeaSummary } from '@/types';
import { Tag } from '@/components/ui/Tag';
import { IconBookmark, IconMessage } from '@/components/ui/Icons';
import { apiUrl } from '@/utils/api';
import { getAttachments, getComments } from '@/utils/ideas';
import { initials, ROLE_LABELS, STAGE_LABELS, STATUS_LABELS, TAG_LABELS } from '@/utils/ideaDisplay';
import { loginHref } from '@/utils/loginNavigation';

type CardIdea = Pick<IdeaSummary, 'title' | 'elevatorPitch' | 'developmentStage' | 'tags' | 'founder'> & {
  id?: string;
  status?: IdeaSummary['status'];
};

interface IdeaCardProps {
  idea: CardIdea;
  previewImage?: string;
  previewAuthor?: { name: string; initials: string; description: string };
  isPreview?: boolean;
  bookmark?: { saved: boolean; disabled: boolean; toggle: () => void };
  signInToSave?: boolean;
}

const stageColors = { CONCEPT: 'bg-[#7403f4]', PROTOTYPE: 'bg-[#f59e0b]', MVP_LIVE: 'bg-[#16a34a]' };

export function IdeaCard({ idea, previewImage, previewAuthor, isPreview, bookmark, signInToSave }: IdeaCardProps) {
  const [cover, setCover] = useState<string>();
  const [commentCount, setCommentCount] = useState<number>();
  const { id, status } = idea;

  useEffect(() => {
    if (isPreview || !id) return;
    const controller = new AbortController();
    setCover(undefined);
    setCommentCount(undefined);
    void getAttachments(id, controller.signal).then((attachments) => {
      if (!controller.signal.aborted && attachments[0]) setCover(apiUrl(attachments[0].url));
    }).catch(() => {});
    if (status === 'PUBLISHED') {
      void getComments(id, controller.signal).then(({ count }) => {
        if (!controller.signal.aborted) setCommentCount(count);
      }).catch(() => {});
    }
    return () => controller.abort();
  }, [id, isPreview, status]);

  const image = isPreview ? previewImage : cover;
  const author = (isPreview && previewAuthor) || {
    name: idea.founder.fullName,
    initials: initials(idea.founder.fullName),
    description: ROLE_LABELS[idea.founder.role],
  };
  const stageLabel = idea.developmentStage ? STAGE_LABELS[idea.developmentStage] : 'Stage pending';
  const badge = status && status !== 'PUBLISHED' ? STATUS_LABELS[status] : stageLabel;
  const card = (
    <article className={`group flex h-full flex-col overflow-hidden rounded-[16px] border border-[#e4e9f0] bg-white shadow-card transition-all duration-200 ${isPreview ? '' : 'hover:-translate-y-[3px] hover:border-[#4865ff]/40 hover:shadow-card-hover'}`}>
      <div className="relative h-[200px] w-full overflow-hidden bg-[linear-gradient(135deg,#0f1b2d,#1a2f4a_55%,#0e4f63)]">
        {image ? (
          // Screenshot URLs are served by the API with browser session cookies.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={idea.title || 'Idea cover'} onError={isPreview ? undefined : () => setCover(undefined)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-2 flex h-[44px] w-[44px] items-center justify-center rounded-[12px] bg-white/10 backdrop-blur-sm">
              <Image src="/assets/logo-primary.svg" width={26} height={26} alt="" className="object-contain brightness-200" />
            </div>
            <p className="line-clamp-1 font-display text-[16px] font-bold text-white/95">{idea.title || 'Your idea title'}</p>
            <span className="mt-1 font-sans text-[12px] text-white/65">
              EDISON UPM{idea.tags[0] ? ` · ${TAG_LABELS[idea.tags[0]]}` : ''}
            </span>
          </div>
        )}
        <div className="absolute left-[14px] top-[14px] inline-flex items-center gap-[6px] rounded-full bg-[#0f1b2d]/75 px-[10px] py-[4px] backdrop-blur-md">
          <span className={`h-[6px] w-[6px] rounded-full ${idea.developmentStage ? stageColors[idea.developmentStage] : 'bg-[#cbd5e1]'}`} />
          <span className="font-sans text-[11px] font-semibold leading-[14px] text-white">{badge}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-[20px]">
        <div>
          {idea.tags.length > 0 && (
            <div className="mb-[10px] flex flex-wrap items-center gap-[6px]">
              {idea.tags.map((tag) => <Tag key={tag} category={tag} />)}
            </div>
          )}
          <h3 className="mb-[6px] font-display text-[20px] font-bold leading-[26px] tracking-[-0.3px] text-[#0f1b2d] transition-colors group-hover:text-[#4865ff]">{idea.title || 'Untitled idea'}</h3>
          <p className="line-clamp-2 font-sans text-[14px] leading-[20px] text-[#334155]">{idea.elevatorPitch}</p>
        </div>
        <div className="mt-[16px] flex items-center justify-between gap-2 border-t border-[#e4e9f0] pt-[12px]">
          <div className="flex items-center gap-[10px]">
            <div aria-hidden="true" className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4865ff] to-[#00adcc] font-display text-[11px] font-bold text-white">
              {author.initials}
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-[13px] font-semibold leading-[17px] text-[#0f1b2d]">{author.name}</span>
              <span className="font-sans text-[11px] leading-[14px] text-[#64748b]">{author.description}</span>
            </div>
          </div>
          {commentCount !== undefined && (
            <span aria-label={`${commentCount} comments`} className="inline-flex items-center gap-1 font-sans text-[12px] font-semibold text-[#64748b]">
              <IconMessage size={14} />{commentCount}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (isPreview || !id) return card;
  const buttonStyle = 'absolute right-[14px] top-[14px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white focus-visible:ring-2 focus-visible:ring-[#4865ff] disabled:opacity-60';
  return (
    <div className="relative h-full">
      <Link href={`/ideas/${id}`} className="block h-full rounded-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4865ff]">{card}</Link>
      {bookmark ? (
        <button type="button" aria-label={bookmark.saved ? `Unsave ${idea.title}` : `Save ${idea.title}`} aria-pressed={bookmark.saved}
          disabled={bookmark.disabled} onClick={bookmark.toggle}
          className={`${buttonStyle} ${bookmark.saved ? 'text-[#4865ff] [&_svg]:fill-current' : 'text-[#0f1b2d]'}`}>
          <IconBookmark size={15} />
        </button>
      ) : signInToSave ? (
        <Link href={loginHref(`/ideas/${id}`)} aria-label={`Sign in to save ${idea.title}`} className={`${buttonStyle} text-[#0f1b2d]`}><IconBookmark size={15} /></Link>
      ) : null}
    </div>
  );
}
