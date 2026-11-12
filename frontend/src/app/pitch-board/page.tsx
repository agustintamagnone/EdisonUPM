'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { IdeaCard } from '@/components/pitch-board/IdeaCard';
import { Chip } from '@/components/ui/Chip';
import { IconPlus, IconSearch } from '@/components/ui/Icons';
import type { IdeaTag } from '@/types';
import { apiErrorMessage } from '@/utils/api';
import { getTags, listIdeas } from '@/utils/ideas';
import { TAG_LABELS } from '@/utils/ideaDisplay';
import { useApiResource } from '@/utils/useApiResource';
import { useSavedIdeas } from '@/utils/useSavedIdeas';

const secondaryButton = 'rounded-[10px] border border-[#e4e9f0] bg-white px-4 py-2 font-sans text-[13px] font-semibold text-[#334155] hover:bg-[#f4f7fa] disabled:opacity-50';

export default function PitchBoardPage() {
  const { user, isRestoring } = useAuth();
  const canPublish = user?.role === 'STUDENT';
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<IdeaTag | null>(null);
  const [page, setPage] = useState(0);
  const fetchPage = useCallback((signal: AbortSignal) => listIdeas(query, tag, page, signal), [query, tag, page]);
  const results = useApiResource(isRestoring ? null : fetchPage, user?.id);
  const tags = useApiResource(getTags);
  const bookmarks = useSavedIdeas();
  const savedIds = new Set(bookmarks.data?.map((idea) => idea.id));
  const data = results.data;

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput.trim());
    setPage(0);
  }

  function selectTag(value: IdeaTag | null) {
    setTag(value);
    setPage(0);
  }

  function clearFilters() {
    setSearchInput('');
    setQuery('');
    selectTag(null);
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <TopNav activeTab="pitch-board" />

      {/* Hero Banner (#4865ff) */}
      <section className="relative w-full overflow-hidden bg-[#4865ff] text-white">
        {/* Decorative Diagonal & Gold Line & Watermark */}
        <Image width={762} height={249}
          src="/assets/hero-diagonal.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[120px] top-0 hidden lg:block h-full w-auto object-cover opacity-90"
        />
        <Image width={401} height={249}
          src="/assets/hero-gold-line.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[430px] top-0 hidden lg:block h-full w-auto object-cover"
        />
        <Image width={340} height={340}
          src="/assets/logo-watermark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-[20px] -top-[18px] hidden xl:block h-[270px] w-[300px] object-contain opacity-25"
        />

        <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-6 py-[36px] lg:flex-row lg:items-center lg:px-[120px]">
          {/* Left Hero Copy */}
          <div className="max-w-[640px]">
            <div className="mb-[10px] inline-flex items-center gap-[8px]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#ffcb22]" />
              <span className="font-sans text-[12px] font-bold uppercase tracking-[1.2px] text-[#ffcb22]">
                SPRING PITCH BOARD · UPM 2026
              </span>
            </div>

            <h1 className="font-display text-[32px] font-extrabold leading-[1.15] tracking-[-0.8px] text-white sm:text-[38px]">
              Where UPM ideas meet their first believers.
            </h1>

            <p className="mt-[10px] max-w-[560px] font-sans text-[15px] font-normal leading-[23px] text-white/90">
              Explore student-led prototypes across UPM schools, give structured feedback, or
              publish your own MVP to find collaborators and mentors.
            </p>
          </div>

          {/* Right Hero CTA + Stats */}
          <div className="flex flex-col items-start gap-[16px] lg:items-end">
            {canPublish && <Link
              href="/publish"
              className="inline-flex h-[48px] items-center gap-[8px] rounded-[10px] bg-[#e6c400] px-[22px] font-sans text-[15px] font-bold text-[#0f1b2d] shadow-[0_8px_20px_rgba(15,27,45,0.2)] transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#ffcb22]"
            >
              <IconPlus size={16} />
              <span>Publish your idea</span>
            </Link>}

            {results.data && (
              <div className="rounded-[12px] border border-white/20 bg-white/10 px-[16px] py-[10px] backdrop-blur-sm">
                <div className="font-display text-[20px] font-extrabold leading-[24px] text-white">
                  {results.data.totalElements}
                </div>
                <div className="font-sans text-[11px] font-medium text-white/80">
                  {query || tag ? 'Matching ideas' : 'Published ideas'}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>


      <main className="mx-auto max-w-[1440px] px-6 py-[32px] lg:px-[120px]">
        <div className="mb-[28px] space-y-4 border-b border-[#e4e9f0] pb-[20px]">
          <form id="idea-search" onSubmit={search} role="search" aria-label="Pitch Board search" className="flex scroll-mt-32 flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:max-w-[360px]">
              <span className="sr-only">Search ideas</span>
              <IconSearch size={16} className="pointer-events-none absolute left-3 top-3 text-[#64748b]" />
              <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search ideas" className="h-10 w-full rounded-[10px] border border-[#e4e9f0] bg-white pl-9 pr-3 text-sm text-[#0f1b2d] focus-visible:outline-[#4865ff]" />
            </label>
            <button type="submit" className={secondaryButton}>Search</button>
          </form>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-[8px]" aria-label="Filter by tag">
              <Chip label="All" selected={tag === null} onClick={() => selectTag(null)} />
              {tags.data?.map((value) => (
                <Chip key={value} label={TAG_LABELS[value]} selected={tag === value} onClick={() => selectTag(value)} />
              ))}
              {tags.error && <span role="status" className="text-sm text-[#64748b]">Tags unavailable. <button type="button" onClick={tags.reload} className={secondaryButton}>Retry tags</button></span>}
            </div>
            <div className="flex flex-wrap items-center gap-[10px]">
              {data && data.totalElements > 0 && (
                <span className="font-sans text-[12px] font-medium text-[#64748b]">
                  Showing {data.page * data.size + 1}–{data.page * data.size + data.content.length} of {data.totalElements}
                </span>
              )}
              <span className="inline-flex h-[36px] items-center rounded-[10px] border border-[#e4e9f0] bg-white px-[12px] font-sans text-[13px] font-semibold text-[#0f1b2d]">
                Newest first
              </span>
            </div>
          </div>
        </div>

        {(bookmarks.actionError || bookmarks.error) && (
          <div role="alert" className="mb-4 rounded-[10px] border border-red-200 bg-white p-3 text-sm text-red-700">
            {bookmarks.actionError || apiErrorMessage(bookmarks.error, 'Could not load saved ideas.')}
            {bookmarks.error && <button type="button" className="ml-2 underline" onClick={bookmarks.reload}>Retry saved ideas</button>}
          </div>
        )}

        {isRestoring || results.loading ? (
          <div role="status" className="rounded-[16px] border border-[#e4e9f0] bg-white p-10 text-center text-sm text-[#64748b]">Loading ideas…</div>
        ) : results.error ? (
          <div role="alert" className="rounded-[16px] border border-[#e4e9f0] bg-white p-10 text-center">
            <p className="mb-3 text-sm text-[#334155]">{apiErrorMessage(results.error, 'Could not load the Pitch Board.')}</p>
            <button type="button" onClick={results.reload} className={secondaryButton}>Try again</button>
          </div>
        ) : data?.content.length ? (
          <>
            <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 lg:grid-cols-3">
              {data.content.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} signInToSave={!user} bookmark={user ? {
                  saved: savedIds.has(idea.id), disabled: !bookmarks.data || bookmarks.saving,
                  toggle: () => void bookmarks.toggle(idea.id),
                } : undefined} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <nav aria-label="Idea pages" className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button type="button" className={secondaryButton} disabled={data.page === 0} onClick={() => setPage(data.page - 1)}>Previous</button>
                <span className="text-sm text-[#64748b]">Page {data.page + 1} of {data.totalPages}</span>
                <button type="button" className={secondaryButton} disabled={data.page + 1 >= data.totalPages} onClick={() => setPage(data.page + 1)}>Next</button>
              </nav>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center rounded-[16px] border border-dashed border-[#cbd5e1] bg-white px-6 py-16 text-center">
            <p className="font-display text-[18px] font-bold text-[#0f1b2d]">{query || tag ? 'No matching ideas' : 'No published ideas yet'}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {(query || tag || page > 0) && <button type="button" onClick={clearFilters} className={secondaryButton}>Show all ideas</button>}
              {canPublish && <Link href="/publish" className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#4865ff] px-4 py-2 font-sans text-[13px] font-semibold text-white hover:bg-[#3144aa]">
                <IconPlus size={14} /> Publish idea
              </Link>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
