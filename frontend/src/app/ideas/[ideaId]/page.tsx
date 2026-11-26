'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { RatingPreview } from '@/components/ideas/RatingPreview';
import { TractionMetricsEditor } from '@/components/ideas/TractionMetricsEditor';
import { Tag } from '@/components/ui/Tag';
import { IconArrowLeft, IconBookmark, IconCheck, IconExternal, IconLock, IconMessage } from '@/components/ui/Icons';
import type { DevelopmentStage, Idea, UserRole } from '@/types';
import { ApiError, apiErrorMessage, apiUrl } from '@/utils/api';
import { formatDate, initials, ROLE_LABELS, STAGE_LABELS, STATUS_LABELS, VISIBILITY_LABELS } from '@/utils/ideaDisplay';
import { getComments, getIdea, isIdeaId, postComment, saveIdeaMetrics } from '@/utils/ideas';
import { loginHref } from '@/utils/loginNavigation';
import { useApiResource } from '@/utils/useApiResource';
import { useSavedIdeas } from '@/utils/useSavedIdeas';

const STAGES_ORDER: DevelopmentStage[] = ['CONCEPT', 'PROTOTYPE', 'MVP_LIVE'];
const roleColors: Record<UserRole, string> = {
  PROFESSOR: 'bg-[#fff7da] text-[#9a6b00]',
  INVESTOR: 'bg-[#e5f7fa] text-[#00869e]',
  ADMINISTRATOR: 'bg-[#e8ebfe] text-[#4865ff]',
  STUDENT: 'bg-[#f2e8ff] text-[#6d28d9]',
};
const primary = 'inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#4865ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3144aa] disabled:opacity-50';
const smallLink = 'font-semibold text-[#4865ff] underline hover:text-[#3144aa]';

export default function IdeaDetailPage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  return <IdeaDetails key={ideaId} ideaId={ideaId} />;
}

function IdeaDetails({ ideaId }: { ideaId: string }) {
  const { user, isRestoring, refreshSession } = useAuth();
  const validId = isIdeaId(ideaId);
  const loadIdea = useCallback((signal: AbortSignal) => getIdea(ideaId, signal), [ideaId]);
  const userId = user?.id;
  const detail = useApiResource(validId && !isRestoring ? loadIdea : null, userId);
  const requiresSignIn = detail.error instanceof ApiError && detail.error.status === 401;
  const signInUrl = loginHref(validId ? `/ideas/${ideaId}` : '/pitch-board');
  const [ideaOverride, setIdeaOverride] = useState<{ idea: Idea; userId: string } | null>(null);
  const idea = ideaOverride && ideaOverride.userId === userId ? ideaOverride.idea : detail.data;
  const isPublished = idea?.status === 'PUBLISHED';
  const isOwner = !!user && user.id === idea?.founder.id;
  const canComment = !!user && isPublished && !!idea &&
    (isOwner || (idea.feedbackEnabled && idea.allowedCommenterRoles.includes(user.role)));
  const loadComments = useCallback((signal: AbortSignal) => getComments(ideaId, signal), [ideaId]);
  const feedback = useApiResource(isPublished ? loadComments : null, userId);
  const bookmarks = useSavedIdeas(isPublished);
  const saved = bookmarks.data?.some((item) => item.id === idea?.id) ?? false;
  const [activeThumb, setActiveThumb] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentPending, setCommentPending] = useState(false);
  const [metricsEditing, setMetricsEditing] = useState(false);
  const [metricsDraft, setMetricsDraft] = useState<string[]>([]);
  const [metricsPending, setMetricsPending] = useState(false);
  const [metricsError, setMetricsError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const requestKey = useRef<{ content: string; userId: string; id: string } | null>(null);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 4500);
    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    if (requiresSignIn && userId) void refreshSession();
  }, [requiresSignIn, userId, refreshSession]);

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !canComment || commentPending) return;
    const content = commentInput.trim();
    if (!content || content.length > 500) {
      setCommentError('Enter a comment of 1 to 500 characters.');
      return;
    }
    if (requestKey.current?.content !== content || requestKey.current.userId !== user.id) {
      requestKey.current = { content, userId: user.id, id: crypto.randomUUID() };
    }
    setCommentError('');
    setCommentPending(true);
    try {
      await postComment(ideaId, content, requestKey.current.id);
      requestKey.current = null;
      setCommentInput('');
      setShowToast(true);
      feedback.reload();
    } catch (error) {
      setCommentError(apiErrorMessage(error, 'Could not post your comment.'));
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await refreshSession();
      }
    } finally {
      setCommentPending(false);
    }
  }

  function startMetricsEdit() {
    if (!idea) return;
    setMetricsDraft(idea.metrics);
    setMetricsError('');
    setMetricsEditing(true);
  }

  function cancelMetricsEdit() {
    setMetricsDraft([]);
    setMetricsError('');
    setMetricsEditing(false);
  }

  async function saveMetrics() {
    if (!user || !idea || !isOwner || !isPublished || metricsPending) return;
    setMetricsPending(true);
    setMetricsError('');
    try {
      const updated = await saveIdeaMetrics(idea.id, metricsDraft);
      setIdeaOverride({ idea: updated, userId: user.id });
      setMetricsEditing(false);
    } catch (error) {
      setMetricsError(apiErrorMessage(error, 'Could not save traction metrics.'));
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await refreshSession();
      }
    } finally {
      setMetricsPending(false);
    }
  }

  if (validId && (isRestoring || detail.loading)) {
    return (
      <div className="min-h-screen bg-[#f4f7fa]">
        <TopNav activeTab="pitch-board" />
        <main role="status" className="mx-auto max-w-[1440px] px-6 py-16 lg:px-[120px]">
          <span className="sr-only">Loading idea…</span>
          <div className="h-8 w-48 animate-pulse rounded bg-[#e4e9f0]" />
          <div className="mt-6 h-64 w-full animate-pulse rounded-[16px] bg-white" />
        </main>
      </div>
    );
  }

  if (!idea) {
    const unavailable = !validId || (detail.error instanceof ApiError && [400, 403, 404].includes(detail.error.status ?? 0));
    return (
      <div className="min-h-screen bg-[#f4f7fa]">
        <TopNav activeTab="pitch-board" />
        <main className="mx-auto max-w-[1440px] px-6 py-20 text-center lg:px-[120px]">
          <div role="alert" className="mx-auto max-w-lg rounded-[16px] border border-[#e4e9f0] bg-white p-8">
            <h1 className="font-display text-2xl font-bold text-[#0f1b2d]">{requiresSignIn ? 'Sign in to view this idea' : unavailable ? 'Idea unavailable' : 'Could not load the idea'}</h1>
            <p className="mt-2 text-sm text-[#64748b]">{requiresSignIn ? detail.error?.message : unavailable ? 'This link may be invalid or the idea may be private.' : apiErrorMessage(detail.error, 'Please try again.')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/pitch-board" className={primary}>Back to Pitch Board</Link>
              {!unavailable && !requiresSignIn && <button type="button" onClick={detail.reload} className={smallLink}>Try again</button>}
              {(requiresSignIn || (validId && unavailable && !user)) && <Link href={signInUrl} className={smallLink}>Sign in</Link>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const stageLabel = idea.developmentStage ? STAGE_LABELS[idea.developmentStage] : 'Stage pending';
  const currentStageIndex = idea.developmentStage ? STAGES_ORDER.indexOf(idea.developmentStage) : -1;
  const galleryImages = idea.screenshots;
  const selectedIndex = Math.min(activeThumb, galleryImages.length - 1);
  const selectedImage = galleryImages[selectedIndex];
  const imageFailed = selectedImage && failedImages.includes(selectedImage.id);
  const metricsEditor = (
    <div className="space-y-3">
      <TractionMetricsEditor metrics={metricsDraft} onChange={setMetricsDraft} disabled={metricsPending} />
      {metricsError && <p role="alert" className="text-sm text-red-700">{metricsError}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void saveMetrics()} disabled={metricsPending} className={primary}>
          {metricsPending ? 'Saving…' : 'Save metrics'}
        </button>
        <button type="button" onClick={cancelMetricsEdit} disabled={metricsPending}
          className="rounded-[10px] border border-[#e4e9f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#f4f7fa] disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-20">
      <TopNav activeTab={isPublished ? 'pitch-board' : 'my-ideas'} />
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
                {idea.tags.map((cat) => (
                  <Tag key={cat} category={cat} />
                ))}
                <span className="inline-flex items-center gap-[6px] rounded-full bg-[#0f1b2d] px-[12px] py-[4px] font-sans text-[12px] font-semibold text-white">
                  <span className="h-[6px] w-[6px] rounded-full bg-[#16a34a]" />
                  <span>
                    {stageLabel} · {idea.publishedAt ? formatDate(idea.publishedAt) : STATUS_LABELS[idea.status]}
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
                {selectedImage && !imageFailed ? (
                  // Native loading sends the browser session directly to the attachment API.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={apiUrl(selectedImage.url)}
                    alt={`${idea.title} prototype image ${selectedIndex + 1}`}
                    onError={() => setFailedImages((images) => [...images, selectedImage.id])}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-white">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                      <Image width={40} height={40}
                        src="/assets/logo-primary.svg"
                        alt=""
                        className="h-10 w-10 object-contain brightness-200"
                      />
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#ffcb22]">
                      {stageLabel} Preview
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
                  {imageFailed ? 'Screenshot unavailable' : selectedImage?.fileName ?? 'No screenshots uploaded'}
                </div>
              </div>

              {galleryImages.length > 1 ? (
                <div className="mt-[12px] grid grid-cols-2 gap-[12px] sm:grid-cols-3">
                  {galleryImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveThumb(index)}
                      aria-label={`Show prototype image ${index + 1}`}
                      aria-pressed={selectedIndex === index}
                      className={`overflow-hidden rounded-[10px] border-2 transition-colors ${
                        selectedIndex === index
                          ? 'border-[#4865ff]'
                          : 'border-transparent hover:border-[#cbd5e1]'
                      }`}
                    >
                      {failedImages.includes(image.id) ? (
                        <span className="flex h-[90px] items-center justify-center bg-[#f4f7fa] text-xs text-[#64748b]">Unavailable</span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={apiUrl(image.url)} alt="" className="h-[90px] w-full object-cover"
                          onError={() => setFailedImages((images) => [...images, image.id])} />
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
                {idea.solutionDescription}
              </p>
            </section>

            {/* Progress & Metrics Card */}
            <section className="rounded-[16px] border border-[#e4e9f0] bg-white p-[28px] shadow-card">
              <div className="mb-[16px] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#00869e]">
                    PROGRESS
                  </div>
                  <h2 className="mt-1 font-display text-[20px] font-bold text-[#0f1b2d]">
                    Development stage
                  </h2>
                </div>
                <span className="rounded-full bg-[#e8ebfe] px-[12px] py-[4px] font-sans text-[12px] font-bold text-[#4865ff]">
                  Stage: {stageLabel}
                </span>
              </div>

              {/* Development stage progress */}
              <div className="mb-[24px] grid grid-cols-3 gap-[8px]">
                {STAGES_ORDER.map((stageName, index) => {
                  const isReached = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  return (
                    <div key={STAGE_LABELS[stageName]} className="flex flex-col">
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

              {isOwner && isPublished && !idea.hasMetrics && (
                <div className="border-t border-[#e4e9f0] pt-4">
                  {metricsEditing ? metricsEditor : (
                    <button type="button" onClick={startMetricsEdit} className={smallLink}>Add traction metrics</button>
                  )}
                </div>
              )}
            </section>

            {idea.hasMetrics && (
              <section aria-labelledby="key-metrics-title" className="rounded-[16px] border border-[#e4e9f0] bg-white p-[24px] shadow-card sm:p-[28px]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 id="key-metrics-title" className="flex items-center gap-2 font-display text-[20px] font-bold text-[#0f1b2d]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#e8ebfe] text-[#4865ff]" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2.5 12.5L6 8.5L8.5 10.5L13.5 4.5M10 4.5H13.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Key metrics
                  </h2>
                  <div className="flex items-center gap-3">
                    {user && <span className="inline-flex items-center gap-1 text-[11px] text-[#64748b]"><IconLock size={12} />Shown because you&apos;re signed in</span>}
                    {isOwner && isPublished && user && (
                      <button type="button" onClick={metricsEditing ? cancelMetricsEdit : startMetricsEdit}
                        className="text-xs font-semibold text-[#4865ff] hover:underline">
                        {metricsEditing ? 'Cancel editing' : 'Edit'}
                      </button>
                    )}
                  </div>
                </div>

                {user ? metricsEditing && isOwner && isPublished ? metricsEditor : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {idea.metrics.map((metric, index) => (
                      <li key={`${index}-${metric}`} className="flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#f4f7fa] px-3 py-2.5 text-[13px] text-[#0f1b2d]">
                        <span className="shrink-0 text-[#4865ff]" aria-hidden="true">↗</span>
                        <span className="break-words">{metric}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="relative overflow-hidden rounded-[12px] border border-dashed border-[#cbd5e1] bg-[#f4f7fa] p-4">
                    <div aria-hidden="true" className="grid grid-cols-2 gap-2 blur-[5px]">
                      {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="flex h-10 items-center gap-2 rounded-[8px] bg-white px-3">
                          <span className="h-3 w-3 rounded-sm bg-[#cbd5e1]" />
                          <span className="h-2 w-3/4 rounded bg-[#cbd5e1]" />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 p-3 backdrop-blur-[2px]">
                      <div className="max-w-sm text-center">
                        <h3 className="flex items-center justify-center gap-2 text-sm font-bold text-[#0f1b2d]">
                          <IconLock size={14} />Sign in to see {idea.title}&apos;s key metrics
                        </h3>
                        <p className="mt-1 text-[11px] leading-4 text-[#64748b]">Metrics are shown only to signed-in students, faculty and investors.</p>
                        <Link href={signInUrl} className={`${primary} mt-2 min-h-8 px-4 py-1.5 text-xs`}>Sign in</Link>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {isPublished && <RatingPreview />}
            {isPublished && (
              <section id="feedback-section" className="rounded-[16px] border border-[#e4e9f0] bg-white p-[28px] shadow-card">
                <div className="mb-[20px] flex flex-wrap items-center gap-[10px]">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.3px] text-[#0f1b2d]">Community feedback</h2>
                  {feedback.data && <span className="rounded-full bg-[#e8ebfe] px-3 py-1 text-xs font-bold text-[#4865ff]">{feedback.data.count}</span>}
                </div>

                {canComment && user ? (
                  <form onSubmit={handleCommentSubmit} className="mb-[24px] rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] p-[16px]">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4865ff] text-xs font-bold text-white">{initials(user.fullName)}</span>
                      <label htmlFor="idea-comment" className="text-sm text-[#334155]">Commenting as <strong>{user.fullName}</strong></label>
                    </div>
                    <textarea id="idea-comment" required maxLength={500} rows={3} value={commentInput} disabled={commentPending}
                      onChange={(event) => { setCommentInput(event.target.value); setCommentError(''); }}
                      placeholder={`Share constructive feedback, a question, or a resource for ${idea.title}…`}
                      className="w-full rounded-[10px] border border-[#e4e9f0] bg-white p-3 text-sm text-[#0f1b2d] focus-visible:outline-[#4865ff]" />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#64748b]">{commentInput.length}/500</span>
                      <button type="submit" className={primary} disabled={commentPending || !commentInput.trim()}>
                        {commentPending ? 'Posting…' : 'Post feedback'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mb-4 rounded-[10px] bg-[#f4f7fa] px-4 py-3 text-sm text-[#64748b]">
                    {!idea.feedbackEnabled ? 'Community feedback is disabled for this idea.' : user
                      ? 'Your role does not have permission to comment on this idea.'
                      : <><Link href={signInUrl} className={smallLink}>Sign in</Link> to leave feedback if your role is allowed.</>}
                  </p>
                )}
                {commentError && <p role="alert" className="mb-4 text-sm text-red-700">{commentError}</p>}
                {feedback.loading ? <p role="status" className="text-sm text-[#64748b]">Loading comments…</p> :
                  feedback.error ? (
                    <p role="alert" className="text-sm text-red-700">{apiErrorMessage(feedback.error, 'Could not load comments.')} <button type="button" onClick={feedback.reload} className={smallLink}>Try again</button></p>
                  ) : feedback.data?.comments.length ? (
                    <div className="space-y-[14px]">
                      {feedback.data.comments.map((comment) => (
                        <article key={comment.id} className="rounded-[12px] border border-[#e4e9f0] bg-white p-[16px]">
                          <div className="flex items-start gap-3">
                            <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8ebfe] text-xs font-bold text-[#4865ff]">{initials(comment.author.fullName)}</div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-[#0f1b2d]">{comment.author.fullName}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleColors[comment.author.role]}`}>{ROLE_LABELS[comment.author.role]}</span>
                              </div>
                              <time dateTime={comment.createdAt} className="text-xs text-[#64748b]">{formatDate(comment.createdAt)}</time>
                            </div>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#334155]">{comment.content}</p>
                        </article>
                      ))}
                    </div>
                  ) : <p className="rounded-[10px] bg-[#f4f7fa] p-4 text-sm text-[#64748b]">No comments yet.</p>}
              </section>
            )}
          </div>

          <aside className="space-y-[20px] lg:col-span-4">
            <div className="rounded-[16px] bg-[#0f1b2d] p-[24px] text-white shadow-card">
              <div className="flex items-center gap-[8px]">
                <span className={`h-2 w-2 rounded-full ${isPublished ? 'bg-[#16a34a]' : 'bg-[#ffcb22]'}`} />
                <span className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#ffcb22]">
                  {isOwner ? 'Your idea · ' : ''}{STATUS_LABELS[idea.status]}
                </span>
              </div>
              <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-white/5 p-[14px] text-sm">
                <span>{isPublished ? VISIBILITY_LABELS[idea.visibility] : 'Only visible to the founder'}</span>
                {feedback.data && <span className="inline-flex items-center gap-1.5"><IconMessage size={14} />{feedback.data.count} {feedback.data.count === 1 ? 'comment' : 'comments'}</span>}
              </div>
              <div className="mt-[18px] flex flex-col gap-[10px]">
                {isPublished && (user ? (
                  <button type="button" aria-pressed={saved} disabled={!bookmarks.data || bookmarks.saving} onClick={() => void bookmarks.toggle(idea.id)} className={primary}>
                    <IconBookmark size={15} />{bookmarks.saving ? 'Updating…' : saved ? 'Unsave idea' : 'Save idea'}
                  </button>
                ) : <Link href={signInUrl} className={primary}><IconBookmark size={15} />Sign in to save</Link>)}
                {isOwner && idea.status === 'DRAFT' && <Link href={`/publish?draft=${idea.id}`} className={primary}>Edit draft</Link>}
                {(bookmarks.actionError || bookmarks.error) && (
                  <p role="alert" className="text-sm text-red-200">
                    {bookmarks.actionError || apiErrorMessage(bookmarks.error, 'Could not load saved ideas.')}
                    {bookmarks.error && <button type="button" onClick={bookmarks.reload} className="ml-2 underline">Retry</button>}
                  </p>
                )}
                <Link href="/pitch-board" className="inline-flex h-[40px] items-center justify-center rounded-[10px] border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10">Browse the Pitch Board</Link>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[24px] shadow-card">
              <div className="mb-[14px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#64748b]">Founder</div>
              <div className="flex items-center gap-[14px]">
                <div aria-hidden="true" className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4865ff] to-[#00adcc] font-display text-[18px] font-bold text-white">{initials(idea.founder.fullName)}</div>
                <div>
                  <h3 className="font-display text-[17px] font-bold text-[#0f1b2d]">{idea.founder.fullName}</h3>
                  <p className="font-sans text-[13px] text-[#334155]">{ROLE_LABELS[idea.founder.role]}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[24px] shadow-card">
              <div className="mb-[8px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#00869e]">Try the MVP</div>
              <h3 className="font-display text-[17px] font-bold text-[#0f1b2d]">Interactive prototype &amp; demo</h3>
              <p className="mt-1 break-all text-[13px] text-[#64748b]">{idea.mvpUrl || 'No MVP link provided.'}</p>
              {idea.mvpUrl && (
                <a href={idea.mvpUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#00adcc] bg-[#e5f7fa]/60 px-4 text-[13px] font-bold text-[#00869e] hover:bg-[#e5f7fa]">
                  Open live MVP <IconExternal size={14} />
                </a>
              )}
            </div>
            {isPublished && idea.feedbackEnabled && (
              <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[24px] shadow-card">
                <div className="mb-[12px] font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#7403f4]">Feedback permissions</div>
                <ul className="space-y-2 text-[13px] text-[#334155]">
                  <li>Founder</li>
                  {idea.allowedCommenterRoles.map((role) => <li key={role}>{ROLE_LABELS[role]}</li>)}
                </ul>
              </div>
            )}
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
