'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopNav } from '@/components/layout/TopNav';
import { Tag } from '@/components/ui/Tag';
import {
  IconArrowLeft,
  IconCheck,
  IconExternal,
  IconMessage,
  IconThumbsUp,
  IconSparkle,
  IconPlus,
} from '@/components/ui/Icons';
import {
  getIdeaBySlug,
  getCommentsForIdea,
  addCommentToIdea,
  getIdeaRatingSummary,
  rateIdea,
  revealIdeaFounder,
  IdeaRatingSummary,
} from '@/utils/storage';
import { INITIAL_IDEAS, INITIAL_COMMENTS, DEMO_FOUNDER } from '@/data/mockData';
import { Idea, FeedbackCommentItem, IdeaStage } from '@/types';

const STAGES_ORDER: IdeaStage[] = ['Idea', 'Prototype', 'MVP', 'Traction'];

function getRoleBadgeStyle(role: FeedbackCommentItem['role']) {
  switch (role) {
    case 'Professor':
      return 'bg-[#fff7da] text-[#9a6b00]';
    case 'Professional':
      return 'bg-[#e5f7fa] text-[#00869e]';
    case 'Founder':
      return 'bg-[#e8ebfe] text-[#4865ff]';
    case 'Peer':
    default:
      return 'bg-[#f2e8ff] text-[#6d28d9]';
  }
}

export default function IdeaDetailPage() {
  const params = useParams<{ slug: string }>();
  const rawSlug = typeof params?.slug === 'string' ? decodeURIComponent(params.slug) : 'wattwise';

  // Seed initial state if slug is wattwise to avoid layout shift
  const initialMatch = INITIAL_IDEAS.find(
    (item) => item.slug.toLowerCase() === rawSlug.toLowerCase()
  );

  const [idea, setIdea] = useState<Idea | null>(initialMatch ?? null);
  const [isLoaded, setIsLoaded] = useState<boolean>(Boolean(initialMatch));
  const [comments, setComments] = useState<FeedbackCommentItem[]>(
    INITIAL_COMMENTS[rawSlug.toLowerCase()] ?? []
  );
  const [commentInput, setCommentInput] = useState('');
  const [commentError, setCommentError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [activeThumb, setActiveThumb] = useState(0);
  const [ratingSummary, setRatingSummary] = useState<IdeaRatingSummary>({
    count: 0,
    average: 0,
    userRating: null,
  });
  const [ratingError, setRatingError] = useState('');
  const [identityError, setIdentityError] = useState('');

  useEffect(() => {
    const found = getIdeaBySlug(rawSlug);
    setIdea(found ?? null);
    setComments(getCommentsForIdea(rawSlug));
    setRatingSummary(getIdeaRatingSummary(rawSlug));
    setActiveThumb(0);
    setIsLoaded(true);
  }, [rawSlug]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea) return;

    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError('Please write a brief comment before posting.');
      return;
    }

    setCommentError('');
    const created = addCommentToIdea(idea.slug, trimmed, idea.isAnonymous);
    setComments((prev) => [created, ...prev]);
    setCommentInput('');
    setShowToast(true);
  };

  const handleRateIdea = (rating: number) => {
    if (!idea) return;
    try {
      setRatingSummary(rateIdea(idea.slug, rating));
      setRatingError('');
    } catch (error) {
      setRatingError(error instanceof Error ? error.message : 'Your rating could not be saved.');
    }
  };

  const handleRevealFounder = () => {
    if (!idea) return;
    try {
      setIdea(revealIdeaFounder(idea.slug));
      setIdentityError('');
    } catch (error) {
      setIdentityError(
        error instanceof Error ? error.message : 'Your name could not be revealed.'
      );
    }
  };

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 4500);
    return () => clearTimeout(timer);
  }, [showToast]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#f4f7fa]">
        <TopNav activeTab="my-ideas" />
        <main className="mx-auto max-w-[1440px] px-6 py-16 lg:px-[120px]">
          <div className="h-8 w-48 animate-pulse rounded bg-[#e4e9f0]" />
          <div className="mt-6 h-64 w-full animate-pulse rounded-[16px] bg-white" />
        </main>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen bg-[#f4f7fa]">
        <TopNav activeTab="pitch-board" />
        <main className="mx-auto max-w-[1440px] px-6 py-20 text-center lg:px-[120px]">
          <div className="mx-auto max-w-lg rounded-[16px] border border-[#e4e9f0] bg-white p-10 shadow-card">
            <h1 className="font-display text-[26px] font-extrabold text-[#0f1b2d]">
              Idea not found
            </h1>
            <p className="mt-2 font-sans text-[15px] text-[#64748b]">
              We couldn&apos;t find an idea with slug &ldquo;{rawSlug}&rdquo;. It may not have been
              published yet in this browser.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href="/pitch-board"
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#4865ff] px-5 py-2.5 font-sans text-[14px] font-semibold text-white hover:bg-[#3144aa]"
              >
                <IconArrowLeft size={15} />
                <span>Back to Pitch Board</span>
              </Link>
              <Link
                href="/publish"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#e4e9f0] bg-white px-5 py-2.5 font-sans text-[14px] font-semibold text-[#0f1b2d] hover:bg-[#f4f7fa]"
              >
                <IconPlus size={15} />
                <span>Publish your idea</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentStageIndex = Math.max(0, STAGES_ORDER.indexOf(idea.stage));
  const isWattWise = idea.slug === 'wattwise';
  const galleryImages = idea.coverImages?.length
    ? idea.coverImages
    : idea.coverImage
    ? [idea.coverImage]
    : [];
  const displayedFounderName = idea.isAnonymous ? 'Anonymous founder' : idea.founder.name;
  const displayedFounderInitials = idea.isAnonymous ? '?' : idea.founder.initials;
  const commenterName = idea.isAnonymous ? 'UPM Community member' : DEMO_FOUNDER.name;
  const commenterInitials = idea.isAnonymous ? 'UP' : DEMO_FOUNDER.initials;

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-20">
      <TopNav activeTab={isWattWise ? 'my-ideas' : 'pitch-board'} />

      {/* Main Container */}
      <main className="mx-auto max-w-[1440px] px-6 pt-[28px] lg:px-[120px]">
        {/* Breadcrumb */}
        <div className="mb-[20px] flex items-center gap-[8px] font-sans text-[13px]">
          <Link
            href="/pitch-board"
            className="inline-flex items-center gap-[6px] font-semibold text-[#4865ff] transition-colors hover:text-[#3144aa]"
          >
            <IconArrowLeft size={14} />
            <span>Pitch Board</span>
          </Link>
          <span className="text-[#cbd5e1]">/</span>
          <span className="font-medium text-[#64748b]">{idea.title}</span>
        </div>

        {/* Two-column layout: 760px Left + 408px Right */}
        <div className="grid grid-cols-1 items-start gap-[32px] lg:grid-cols-12">
          {/* LEFT MAIN COLUMN (7 cols ~ 760px) */}
          <div className="space-y-[24px] lg:col-span-8">
            {/* Header Block */}
            <div>
              {/* Tags + Stage Badge */}
              <div className="mb-[14px] flex flex-wrap items-center gap-[8px]">
                {idea.industries.map((cat) => (
                  <Tag key={cat} category={cat} />
                ))}
                <span className="inline-flex items-center gap-[6px] rounded-full bg-[#0f1b2d] px-[12px] py-[4px] font-sans text-[12px] font-semibold text-white">
                  <span className="h-[6px] w-[6px] rounded-full bg-[#16a34a]" />
                  <span>
                    {idea.stage === 'MVP' ? 'MVP live' : idea.stage} ·{' '}
                    {isWattWise ? 'Updated 2d ago' : 'Published recently'}
                  </span>
                </span>
              </div>

              {/* Idea Title */}
              <h1 className="font-display text-[36px] font-extrabold leading-[1.15] tracking-[-1px] text-[#0f1b2d] sm:text-[44px]">
                {idea.title}
              </h1>

              {/* Elevator Pitch */}
              <p className="mt-[12px] font-sans text-[18px] font-normal leading-[28px] text-[#334155]">
                {idea.elevatorPitch}
              </p>
            </div>

            {/* MVP Gallery / Cover Card */}
            <div className="overflow-hidden rounded-[16px] border border-[#e4e9f0] bg-white p-[16px] shadow-card">
              <div
                className="relative h-[320px] sm:h-[380px] w-full overflow-hidden rounded-[12px]"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, rgb(15, 27, 45) 0%, rgb(26, 47, 74) 55%, rgb(14, 79, 99) 100%)',
                }}
              >
                {galleryImages.length > 0 ? (
                  <img
                    src={galleryImages[Math.min(activeThumb, galleryImages.length - 1)]}
                    alt={`${idea.title} prototype image ${Math.min(activeThumb, galleryImages.length - 1) + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-white">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                      <img
                        src="/assets/logo-primary.svg"
                        alt=""
                        className="h-10 w-10 object-contain brightness-200"
                      />
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#ffcb22]">
                      {idea.stage} Preview
                    </span>
                    <h2 className="mt-3 font-display text-[28px] font-extrabold text-white">
                      {idea.title}
                    </h2>
                    <p className="mt-2 max-w-lg font-sans text-[14px] text-white/80">
                      {idea.elevatorPitch}
                    </p>
                  </div>
                )}

                <div className="absolute bottom-[14px] left-[14px] rounded-[8px] bg-[#0f1b2d]/80 px-[12px] py-[6px] font-sans text-[12px] font-medium text-white backdrop-blur-md">
                  {isWattWise
                    ? activeThumb === 0
                      ? 'Live dorm consumption dashboard · Madrid residence hall pilot'
                      : activeThumb === 1
                      ? 'Weekly AI appliance disaggregation & tariff savings coach'
                      : 'Plug-and-play Wi-Fi smart plug hardware prototype'
                    : `${idea.title} · ${idea.stage} showcase`}
                </div>
              </div>

              {idea.coverImages && idea.coverImages.length > 1 ? (
                <div className="mt-[12px] grid grid-cols-2 gap-[12px] sm:grid-cols-3">
                  {idea.coverImages.map((image, index) => (
                    <button
                      key={`${idea.slug}-image-${index}`}
                      type="button"
                      onClick={() => setActiveThumb(index)}
                      aria-label={`Show prototype image ${index + 1}`}
                      aria-pressed={activeThumb === index}
                      className={`overflow-hidden rounded-[10px] border-2 transition-colors ${
                        activeThumb === index
                          ? 'border-[#4865ff]'
                          : 'border-transparent hover:border-[#cbd5e1]'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${idea.title} prototype thumbnail ${index + 1}`}
                        className="h-[90px] w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : isWattWise ? (
                <div className="mt-[12px] grid grid-cols-3 gap-[12px]">
                  {[
                    { label: '01 · Live consumption', sub: 'Dashboard UI' },
                    { label: '02 · Weekly AI tips', sub: 'Mobile coach' },
                    { label: '03 · Smart-plug setup', sub: 'Hardware unit' },
                  ].map((thumb, idx) => (
                    <button
                      key={thumb.label}
                      type="button"
                      onClick={() => setActiveThumb(idx)}
                      className={`flex items-center justify-between rounded-[10px] border px-[14px] py-[10px] text-left transition-all ${
                        activeThumb === idx
                          ? 'border-[#4865ff] bg-[#e8ebfe]/60'
                          : 'border-[#e4e9f0] bg-[#f4f7fa] hover:bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-sans text-[12px] font-bold text-[#0f1b2d]">
                          {thumb.label}
                        </div>
                        <div className="font-sans text-[11px] text-[#64748b]">{thumb.sub}</div>
                      </div>
                      {activeThumb === idx && (
                        <span className="h-2 w-2 rounded-full bg-[#4865ff]" />
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Problem Statement Card (with 5px Gold Left Border) */}
            <section className="rounded-[16px] border border-[#e4e9f0] border-l-[5px] border-l-[#e6c400] bg-white p-[28px] shadow-card">
              <div className="mb-[8px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#9a6b00]">
                THE PROBLEM
              </div>
              <h2 className="mb-[12px] font-display text-[22px] font-bold leading-[28px] tracking-[-0.3px] text-[#0f1b2d]">
                Why this matters right now
              </h2>
              <p className="whitespace-pre-line font-sans text-[15px] font-normal leading-[24px] text-[#334155]">
                {idea.problemStatement}
              </p>
            </section>

            {/* Our Solution / Description Card */}
            <section className="rounded-[16px] border border-[#e4e9f0] bg-white p-[28px] shadow-card">
              <div className="mb-[8px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#4865ff]">
                OUR SOLUTION
              </div>
              <h2 className="mb-[12px] font-display text-[22px] font-bold leading-[28px] tracking-[-0.3px] text-[#0f1b2d]">
                How {idea.title} works
              </h2>
              <p className="whitespace-pre-line font-sans text-[15px] font-normal leading-[24px] text-[#334155]">
                {idea.description}
              </p>
            </section>

            {/* Progress & Metrics Card */}
            <section className="rounded-[16px] border border-[#e4e9f0] bg-white p-[28px] shadow-card">
              <div className="mb-[16px] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#00869e]">
                    PROGRESS &amp; METRICS
                  </div>
                  <h2 className="mt-1 font-display text-[20px] font-bold text-[#0f1b2d]">
                    Development stage &amp; early validation
                  </h2>
                </div>
                <span className="rounded-full bg-[#e8ebfe] px-[12px] py-[4px] font-sans text-[12px] font-bold text-[#4865ff]">
                  Stage: {idea.stage}
                </span>
              </div>

              {/* 4-Step Stage Progress Bar */}
              <div className="mb-[24px] grid grid-cols-4 gap-[8px]">
                {STAGES_ORDER.map((stageName, index) => {
                  const isReached = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  return (
                    <div key={stageName} className="flex flex-col">
                      <div
                        className={`h-[8px] w-full rounded-full transition-colors ${
                          isReached ? 'bg-[#4865ff]' : 'bg-[#e4e9f0]'
                        }`}
                      />
                      <div className="mt-[8px] flex items-center gap-[5px]">
                        {isReached && (
                          <span
                            className={`flex h-[15px] w-[15px] items-center justify-center rounded-full text-[10px] ${
                              isCurrent
                                ? 'bg-[#4865ff] text-white'
                                : 'bg-[#e8ebfe] text-[#4865ff]'
                            }`}
                          >
                            ✓
                          </span>
                        )}
                        <span
                          className={`font-sans text-[12px] ${
                            isCurrent
                              ? 'font-bold text-[#4865ff]'
                              : isReached
                              ? 'font-semibold text-[#0f1b2d]'
                              : 'font-medium text-[#64748b]'
                          }`}
                        >
                          {stageName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Metrics Grid */}
              {idea.metrics && idea.metrics.length > 0 ? (
                <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
                  {idea.metrics.map((metric, idx) => (
                    <div
                      key={`${metric.label}-${idx}`}
                      className="rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] p-[16px]"
                    >
                      <div className="font-display text-[26px] font-extrabold leading-[32px] tracking-[-0.5px] text-[#0f1b2d]">
                        {metric.value || '—'}
                      </div>
                      <div className="mt-[4px] font-sans text-[12px] font-medium leading-[16px] text-[#64748b]">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] px-[16px] py-[14px] font-sans text-[13px] text-[#64748b]">
                  Currently at the <strong className="text-[#0f1b2d]">{idea.stage}</strong> stage.
                  Quantitative pilot metrics will be shared as testing progresses.
                </div>
              )}
            </section>

            {/* FEEDBACK SECTION */}
            <section
              id="feedback-section"
              className="rounded-[16px] border border-[#e4e9f0] bg-white p-[28px] shadow-card"
            >
              <div className="mb-[20px] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-[10px]">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.3px] text-[#0f1b2d]">
                    Community Feedback
                  </h2>
                  <span className="inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-full bg-[#e8ebfe] px-[8px] font-sans text-[12px] font-bold text-[#4865ff]">
                    {comments.length}
                  </span>
                </div>
                <span className="font-sans text-[12px] text-[#64748b]">
                  Commenting as <strong className="text-[#0f1b2d]">{commenterName}</strong>
                </span>
              </div>

              <div className="mb-[20px] flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[#e4e9f0] bg-[#fff7da]/60 p-[16px]">
                <div>
                  <h3 className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                    Prefer not to comment? Rate this idea
                  </h3>
                  <p className="mt-1 font-sans text-[12px] text-[#64748b]">
                    Your rating is saved only in this browser in this prototype.
                  </p>
                </div>
                <div className="flex items-center gap-[4px]" role="group" aria-label="Rate this idea from 1 to 5">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRateIdea(rating)}
                      aria-label={`${rating} out of 5`}
                      aria-pressed={ratingSummary.userRating === rating}
                      className={`rounded-[6px] px-[5px] py-[2px] text-[24px] leading-none transition-colors ${
                        ratingSummary.userRating !== null && rating <= ratingSummary.userRating
                          ? 'text-[#b88700]'
                          : 'text-[#cbd5e1] hover:text-[#b88700]'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  {ratingSummary.userRating !== null && (
                    <span className="ml-1 font-sans text-[12px] font-semibold text-[#334155]">
                      {ratingSummary.average.toFixed(1)} / 5 · {ratingSummary.count} local rating
                    </span>
                  )}
                </div>
                {ratingError && (
                  <p role="alert" className="w-full font-sans text-[12px] font-medium text-[#dc2626]">
                    {ratingError}
                  </p>
                )}
              </div>

              {/* Submit Feedback Form */}
              <form
                onSubmit={handleCommentSubmit}
                className="mb-[24px] rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] p-[16px]"
              >
                <div className="mb-[10px] flex items-center gap-[10px]">
                  <div
                    className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, #4865ff 0%, #00adcc 100%)',
                    }}
                  >
                    {commenterInitials}
                  </div>
                  <div>
                    <div className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                      {commenterName}
                    </div>
                    <div className="font-sans text-[11px] text-[#64748b]">
                      {idea.isAnonymous ? 'UPM Community' : DEMO_FOUNDER.fullDegreeAndSchool}
                    </div>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={commentInput}
                  onChange={(e) => {
                    setCommentInput(e.target.value);
                    if (commentError) setCommentError('');
                  }}
                  placeholder={`Share constructive feedback, a question, or a resource for ${idea.title}...`}
                  className="w-full rounded-[10px] border border-[#e4e9f0] bg-white p-[12px] font-sans text-[14px] text-[#0f1b2d] placeholder:text-[#64748b] focus:border-[#4865ff] focus:outline-none focus:ring-2 focus:ring-[#4865ff]/15"
                />

                {commentError && (
                  <p className="mt-1.5 font-sans text-[12px] font-medium text-[#dc2626]">
                    {commentError}
                  </p>
                )}

                <div className="mt-[12px] flex items-center justify-between">
                  <span className="font-sans text-[12px] text-[#64748b]">
                    Be specific and constructive — UPM mentors &amp; peers read every note.
                  </span>
                  <button
                    type="submit"
                    className="inline-flex h-[38px] items-center gap-[8px] rounded-[10px] bg-[#4865ff] px-[18px] font-sans text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#3144aa]"
                  >
                    <IconMessage size={14} />
                    <span>Post feedback</span>
                  </button>
                </div>
              </form>

              {/* Comments List */}
              {comments.length > 0 ? (
                <div className="space-y-[14px]">
                  {comments.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-[12px] border p-[20px] transition-colors ${
                        item.isNew
                          ? 'border-[#4865ff] bg-[#f8f9ff]'
                          : 'border-[#e4e9f0] bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-[10px]">
                          <div
                            className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white"
                            style={{
                              backgroundImage:
                                item.role === 'Professor'
                                  ? 'linear-gradient(135deg, #0f1b2d 0%, #3144aa 100%)'
                                  : 'linear-gradient(135deg, #4865ff 0%, #00adcc 100%)',
                            }}
                          >
                            {item.authorInitials}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-[6px]">
                              <span className="font-sans text-[14px] font-bold text-[#0f1b2d]">
                                {item.authorName}
                              </span>
                              <span
                                className={`rounded-full px-[8px] py-[2px] font-sans text-[11px] font-semibold ${getRoleBadgeStyle(
                                  item.role
                                )}`}
                              >
                                {item.role}
                              </span>
                              {item.isNew && (
                                <span className="rounded-full bg-[#4865ff] px-[7px] py-[1px] font-sans text-[10px] font-bold uppercase tracking-[0.5px] text-white">
                                  NEW
                                </span>
                              )}
                            </div>
                            <div className="font-sans text-[12px] text-[#64748b]">
                              UPM Community {item.timeLabel}
                            </div>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-[5px] rounded-[8px] border border-[#e4e9f0] bg-[#f4f7fa] px-[10px] py-[4px] font-sans text-[12px] font-semibold text-[#334155]">
                          <IconThumbsUp size={13} />
                          <span>Helpful ({item.helpfulCount})</span>
                        </div>
                      </div>

                      <p className="mt-[12px] font-sans text-[14px] font-normal leading-[22px] text-[#0f1b2d]">
                        {item.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-[#cbd5e1] bg-[#f4f7fa]/60 px-6 py-10 text-center">
                  <p className="font-display text-[16px] font-bold text-[#0f1b2d]">
                    No feedback comments yet
                  </p>
                  <p className="mt-1 font-sans text-[13px] text-[#64748b]">
                    Be the first to share feedback on {idea.title} using the form above.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR COLUMN (4 cols ~ 408px) */}
          <aside className="space-y-[20px] lg:col-span-4">
            {/* Dark Owner / Status Panel */}
            <div className="rounded-[16px] bg-[#0f1b2d] p-[24px] text-white shadow-card">
              <div className="flex items-center gap-[8px]">
                <span className="h-[8px] w-[8px] rounded-full bg-[#16a34a]" />
                <span className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#ffcb22]">
                  YOUR IDEA · LIVE ON PITCH BOARD
                </span>
              </div>

              {/* 3 Stat columns */}
              <div className="mt-[18px] grid grid-cols-3 gap-[10px] rounded-[12px] bg-white/5 p-[14px]">
                <div>
                  <div className="font-display text-[22px] font-extrabold text-white">
                    {idea.viewsCount}
                  </div>
                  <div className="font-sans text-[11px] text-white/70">Views</div>
                </div>
                <div>
                  <div className="font-display text-[22px] font-extrabold text-white">
                    {idea.savesCount}
                  </div>
                  <div className="font-sans text-[11px] text-white/70">Saved</div>
                </div>
                <div>
                  <div className="font-display text-[22px] font-extrabold text-[#ffcb22]">
                    {comments.length}
                  </div>
                  <div className="font-sans text-[11px] text-white/70">Reviews</div>
                </div>
              </div>

              {/* Views Sparkline */}
              <div className="mt-[16px] flex items-center justify-between rounded-[10px] bg-white/5 px-[12px] py-[10px]">
                <span className="font-sans text-[12px] text-white/80">7-day campus reach</span>
                <img
                  src="/assets/views-trend.svg"
                  alt="Views trend"
                  className="h-[24px] w-[110px] object-contain"
                />
              </div>

              <div className="mt-[18px] flex flex-col gap-[10px]">
                <Link
                  href="/publish"
                  className="inline-flex h-[42px] w-full items-center justify-center gap-[8px] rounded-[10px] bg-[#4865ff] px-[16px] font-sans text-[13px] font-semibold text-white transition-colors hover:bg-[#3144aa]"
                >
                  <IconPlus size={15} />
                  <span>Publish another idea</span>
                </Link>
                <Link
                  href="/pitch-board"
                  className="inline-flex h-[40px] w-full items-center justify-center rounded-[10px] border border-white/20 bg-white/5 px-[16px] font-sans text-[13px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Browse all ideas on Pitch Board
                </Link>
              </div>
            </div>

            {/* Founder Card */}
            <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[24px] shadow-card">
              <div className="mb-[14px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#64748b]">
                FOUNDER
              </div>

              <div className="flex items-center gap-[14px]">
                <div
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full font-display text-[18px] font-bold text-white"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #4865ff 0%, #00adcc 100%)',
                  }}
                >
                  {displayedFounderInitials}
                </div>
                <div>
                  <h3 className="font-display text-[17px] font-bold text-[#0f1b2d]">
                    {displayedFounderName}
                  </h3>
                  {idea.isAnonymous ? (
                    <p className="font-sans text-[13px] text-[#64748b]">Identity hidden</p>
                  ) : (
                    <>
                      <p className="font-sans text-[13px] text-[#334155]">
                        {idea.founder.fullDegreeAndSchool}
                      </p>
                      <span className="mt-1 inline-block rounded-md bg-[#f4f7fa] px-2 py-0.5 font-sans text-[11px] font-semibold text-[#64748b]">
                        {idea.founder.schoolAndYear} · UPM
                      </span>
                    </>
                  )}
                </div>
              </div>

              {idea.isAnonymous ? (
                <div className="mt-[14px]">
                  <p className="font-sans text-[12px] leading-[18px] text-[#64748b]">
                    The founder has chosen to keep their identity private.
                  </p>
                  <button
                    type="button"
                    onClick={handleRevealFounder}
                    className="mt-3 inline-flex h-[36px] items-center justify-center rounded-[9px] border border-[#e4e9f0] bg-white px-[12px] font-sans text-[12px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
                  >
                    Reveal my name
                  </button>
                  <p className="mt-2 font-sans text-[10px] leading-[15px] text-[#64748b]">
                    Browser-only demo: anyone with access to this browser can use this control.
                  </p>
                  {identityError && (
                    <p role="alert" className="mt-2 font-sans text-[12px] font-medium text-[#dc2626]">
                      {identityError}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-[14px] font-sans text-[13px] leading-[20px] text-[#334155]">
                  {idea.founder.bio}
                </p>
              )}
            </div>

            {/* Try the MVP Card */}
            <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[24px] shadow-card">
              <div className="mb-[8px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#00869e]">
                TRY THE MVP
              </div>
              <h3 className="font-display text-[17px] font-bold text-[#0f1b2d]">
                Interactive prototype &amp; demo
              </h3>
              <p className="mt-[4px] break-all font-sans text-[13px] text-[#64748b]">
                {idea.mvpUrl || `https://edison.upm.es/demo/${idea.slug}`}
              </p>

              <a
                href={idea.mvpUrl || '#feedback-section'}
                target={idea.mvpUrl ? '_blank' : undefined}
                rel={idea.mvpUrl ? 'noopener noreferrer' : undefined}
                className="mt-[16px] inline-flex h-[42px] w-full items-center justify-center gap-[8px] rounded-[10px] border-[2px] border-[#00adcc] bg-[#e5f7fa]/60 px-[16px] font-sans text-[13px] font-bold text-[#00869e] transition-colors hover:bg-[#e5f7fa]"
              >
                <span>{idea.mvpUrl ? 'Open live MVP' : 'Leave MVP feedback'}</span>
                <IconExternal size={14} />
              </a>
            </div>

            {/* Looking For Card */}
            <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[24px] shadow-card">
              <div className="mb-[12px] flex items-center gap-[6px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#7403f4]">
                <IconSparkle size={14} />
                <span>WHAT THE FOUNDER IS LOOKING FOR</span>
              </div>

              <ul className="space-y-[10px]">
                {(idea.lookingFor && idea.lookingFor.length > 0
                  ? idea.lookingFor
                  : [
                      'Early student testers at UPM',
                      'Constructive product & UX feedback',
                      'Mentorship from UPM professors',
                    ]
                ).map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-[10px] font-sans text-[13px] text-[#334155]"
                  >
                    <span className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#e7f6ec] text-[#16a34a]">
                      <IconCheck size={11} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Figma Feedback Posted Toast (Screen 05) */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[14px] border border-[#16a34a]/30 bg-[#0f1b2d] px-5 py-3.5 text-white shadow-[0_16px_40px_rgba(15,27,45,0.32)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16a34a] text-white">
            <IconCheck size={15} />
          </span>
          <div>
            <div className="font-sans text-[13px] font-bold text-white">
              Feedback posted!
            </div>
            <div className="font-sans text-[12px] text-white/75">
              Your comment is now visible on {idea.title}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
