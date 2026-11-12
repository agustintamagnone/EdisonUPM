'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TopNav } from '@/components/layout/TopNav';
import { IdeaCard } from '@/components/pitch-board/IdeaCard';
import { Chip } from '@/components/ui/Chip';
import { IconPlus, IconChevDown } from '@/components/ui/Icons';
import { INITIAL_IDEAS, INDUSTRY_CATEGORIES } from '@/data/mockData';
import { getIdeas, getCommentCount } from '@/utils/storage';
import { Idea, IndustryCategory } from '@/types';

export default function PitchBoardPage() {
  const [ideas, setIdeas] = useState<Idea[]>(INITIAL_IDEAS);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({
    wattwise: 1,
  });
  const [selectedCategory, setSelectedCategory] = useState<'All' | IndustryCategory>('All');

  useEffect(() => {
    const loadedIdeas = getIdeas();
    setIdeas(loadedIdeas);

    const counts: Record<string, number> = {};
    for (const item of loadedIdeas) {
      counts[item.slug] = getCommentCount(item.slug);
    }
    setCommentCounts(counts);
  }, []);

  const filteredIdeas =
    selectedCategory === 'All'
      ? ideas
      : ideas.filter((idea) => idea.industries.includes(selectedCategory));

  const totalComments = Object.values(commentCounts).reduce((acc, n) => acc + n, 0);

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <TopNav activeTab="pitch-board" />

      {/* Hero Banner (#4865ff) */}
      <section className="relative w-full overflow-hidden bg-[#4865ff] text-white">
        {/* Decorative Diagonal & Gold Line & Watermark */}
        <img
          src="/assets/hero-diagonal.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[120px] top-0 hidden lg:block h-full w-auto object-cover opacity-90"
        />
        <img
          src="/assets/hero-gold-line.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[430px] top-0 hidden lg:block h-full w-auto object-cover"
        />
        <img
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
            <Link
              href="/publish"
              className="inline-flex h-[48px] items-center gap-[8px] rounded-[10px] bg-[#e6c400] px-[22px] font-sans text-[15px] font-bold text-[#0f1b2d] shadow-[0_8px_20px_rgba(15,27,45,0.2)] transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#ffcb22]"
            >
              <IconPlus size={16} />
              <span>Publish your idea</span>
            </Link>

            <div className="flex items-center gap-[12px]">
              <div className="rounded-[12px] border border-white/20 bg-white/10 px-[16px] py-[10px] backdrop-blur-sm">
                <div className="font-display text-[20px] font-extrabold leading-[24px] text-white">
                  {ideas.length}
                </div>
                <div className="font-sans text-[11px] font-medium text-white/80">
                  {ideas.length === 1 ? 'Published idea' : 'Published ideas'}
                </div>
              </div>
              <div className="rounded-[12px] border border-white/20 bg-white/10 px-[16px] py-[10px] backdrop-blur-sm">
                <div className="font-display text-[20px] font-extrabold leading-[24px] text-white">
                  {totalComments}
                </div>
                <div className="font-sans text-[11px] font-medium text-white/80">
                  Peer reviews
                </div>
              </div>
              <div className="rounded-[12px] border border-white/20 bg-white/10 px-[16px] py-[10px] backdrop-blur-sm">
                <div className="font-display text-[20px] font-extrabold leading-[24px] text-white">
                  7
                </div>
                <div className="font-sans text-[11px] font-medium text-white/80">
                  UPM Schools
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1440px] px-6 py-[32px] lg:px-[120px]">
        {/* Filter Bar Row */}
        <div className="mb-[28px] flex flex-col justify-between gap-4 border-b border-[#e4e9f0] pb-[20px] lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-[8px]">
            <Chip
              label={`All (${ideas.length})`}
              selected={selectedCategory === 'All'}
              onClick={() => setSelectedCategory('All')}
            />
            {INDUSTRY_CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category}
                selected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              />
            ))}
          </div>

          <div className="flex items-center gap-[10px] self-start lg:self-auto">
            <span className="font-sans text-[12px] font-medium text-[#64748b]">
              Showing {filteredIdeas.length}{' '}
              {filteredIdeas.length === 1 ? 'project' : 'projects'}
            </span>
            <div className="inline-flex h-[36px] items-center gap-[6px] rounded-[10px] border border-[#e4e9f0] bg-white px-[12px] font-sans text-[13px] font-semibold text-[#0f1b2d]">
              <span className="text-[#64748b] font-normal">Sort:</span>
              <span>Trending</span>
              <IconChevDown size={13} className="text-[#64748b]" />
            </div>
          </div>
        </div>

        {/* Ideas Grid */}
        {filteredIdeas.length > 0 ? (
          <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 lg:grid-cols-3">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                commentCount={commentCounts[idea.slug] ?? 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#cbd5e1] bg-white px-6 py-16 text-center">
            <p className="font-display text-[18px] font-bold text-[#0f1b2d]">
              No ideas in &ldquo;{selectedCategory}&rdquo; yet
            </p>
            <p className="mt-1 max-w-md font-sans text-[14px] text-[#64748b]">
              Be the first UPM student to publish an idea in this category or switch back to all
              categories.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="rounded-[10px] border border-[#e4e9f0] bg-white px-4 py-2 font-sans text-[13px] font-semibold text-[#334155] hover:bg-[#f4f7fa]"
              >
                Show all ideas
              </button>
              <Link
                href="/publish"
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#4865ff] px-4 py-2 font-sans text-[13px] font-semibold text-white hover:bg-[#3144aa]"
              >
                <IconPlus size={14} />
                <span>Publish idea</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
