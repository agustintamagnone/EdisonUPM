'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { IdeaCard } from '@/components/pitch-board/IdeaCard';
import { AnonymousPublishingPreview, anonymousPreviewAuthor, type AnonymousPreviewMode } from '@/components/publish/AnonymousPublishingPreview';
import { DraftScreenshotGallery } from '@/components/publish/DraftScreenshotGallery';
import { Tag } from '@/components/ui/Tag';
import { IconBulb, IconCheck, IconClose, IconGlobe, IconLink, IconLock, IconUpload } from '@/components/ui/Icons';
import type { DevelopmentStage, Idea, IdeaTag, UserRole, Visibility } from '@/types';
import type { AuthUser } from '@/utils/auth';
import { ApiError, apiErrorMessage, apiUrl } from '@/utils/api';
import { ROLE_LABELS, STAGE_LABELS, TAG_LABELS } from '@/utils/ideaDisplay';
import { loginHref } from '@/utils/loginNavigation';
import {
  getIdea, getStages, getTags, isIdeaId, publishIdea, removeAttachment, saveBasics,
  saveClassification, saveMvpLink, uploadAttachment,
} from '@/utils/ideas';
import { useApiResource } from '@/utils/useApiResource';

type WizardStep = 1 | 2 | 3;
const COMMENT_ROLES: UserRole[] = ['STUDENT', 'PROFESSOR', 'INVESTOR', 'ADMINISTRATOR'];
const STAGE_DESCRIPTIONS: Record<DevelopmentStage, string> = {
  CONCEPT: 'Concept & research',
  PROTOTYPE: 'Clickable / lab build',
  MVP_LIVE: 'Working product',
};
const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const noticeLink = 'font-semibold text-[#4865ff] underline hover:text-[#3144aa]';

function WizardNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <TopNav activeTab="my-ideas" />
      <main className="mx-auto max-w-[1440px] px-6 py-10 lg:px-[120px]">
        <h1 className="mb-6 font-display text-[32px] font-extrabold text-[#0f1b2d]">Publish your idea</h1>
        <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-8 text-sm text-[#334155]">{children}</div>
      </main>
    </div>
  );
}

export default function PublishIdeaPage() {
  return (
    <Suspense fallback={<WizardNotice><p role="status">Loading publication wizard…</p></WizardNotice>}>
      <PublishRoute />
    </Suspense>
  );
}

function PublishRoute() {
  const { user, isRestoring, sessionError, refreshSession } = useAuth();
  const params = useSearchParams();
  const draftId = params.get('draft') ?? '';
  const validDraft = !!draftId && isIdeaId(draftId);
  const loadDraft = useCallback((signal: AbortSignal) => getIdea(draftId, signal), [draftId]);
  const draft = useApiResource(user && validDraft ? loadDraft : null, user?.id);
  const returnPath = validDraft ? `/publish?draft=${draftId}${params.get('step') === '2' ? '&step=2' : ''}` : '/publish';

  useEffect(() => {
    if (draft.error instanceof ApiError && draft.error.status === 401) void refreshSession();
  }, [draft.error, refreshSession]);

  if (isRestoring || draft.loading) return <WizardNotice><p role="status">Loading publication wizard…</p></WizardNotice>;
  if (!user) return (
    <WizardNotice>
      {sessionError && (
        <p role="alert" className="mb-3 text-red-700">{sessionError}{' '}
          <button type="button" className="underline" onClick={() => void refreshSession()}>Retry session check</button>
        </p>
      )}
      <Link href={loginHref(returnPath)} className={noticeLink}>Sign in</Link>{draftId ? ' to open your draft.' : ' with a UPM student account to create an idea.'}
    </WizardNotice>
  );
  if (!draftId && user.role !== 'STUDENT') return <WizardNotice>Only UPM students can create ideas. <Link href="/pitch-board" className={noticeLink}>Browse the Pitch Board</Link></WizardNotice>;
  if (draftId && !validDraft) return <WizardNotice>This draft link is invalid. <Link href="/my-ideas" className={noticeLink}>Go to My Ideas</Link></WizardNotice>;
  if (draft.error) {
    return (
      <WizardNotice>
        <p role="alert">{apiErrorMessage(draft.error, 'Could not open the draft.')}</p>
        <div className="mt-3 flex gap-4">
          <button type="button" className={noticeLink} onClick={draft.reload}>Try again</button>
          <Link href="/my-ideas" className={noticeLink}>Go to My Ideas</Link>
        </div>
      </WizardNotice>
    );
  }
  if (draftId && (!draft.data || draft.data.founder.id !== user.id || draft.data.status !== 'DRAFT')) {
    return <WizardNotice>Only your own drafts can be edited. <Link href="/my-ideas" className={noticeLink}>Go to My Ideas</Link></WizardNotice>;
  }

  return <PublishWizard key={draftId || user.id} user={user} initialDraft={draft.data} initialStep={draft.data && params.get('step') === '2' ? 2 : 1} />;
}

function PublishWizard({ user, initialDraft, initialStep }: { user: AuthUser; initialDraft?: Idea; initialStep: WizardStep }) {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [draft, setDraft] = useState<Idea | null>(initialDraft ?? null);
  const [title, setTitle] = useState(initialDraft?.title ?? '');
  const [elevatorPitch, setElevatorPitch] = useState(initialDraft?.elevatorPitch ?? '');
  const [problemStatement, setProblemStatement] = useState(initialDraft?.problemStatement ?? '');
  const [description, setDescription] = useState(initialDraft?.solutionDescription ?? '');
  const [industries, setIndustries] = useState<IdeaTag[]>(initialDraft?.tags ?? []);
  const [stage, setStage] = useState<DevelopmentStage | null>(initialDraft?.developmentStage ?? null);
  const [mvpUrl, setMvpUrl] = useState(initialDraft?.mvpUrl ?? '');
  const [feedbackEnabled, setFeedbackEnabled] = useState(initialDraft?.feedbackEnabled ?? true);
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>(initialDraft?.allowedCommenterRoles ?? COMMENT_ROLES);
  const [visibility, setVisibility] = useState<Visibility>(initialDraft?.visibility ?? 'PUBLIC');
  const [anonymousPreview, setAnonymousPreview] = useState<AnonymousPreviewMode>('off');
  const [uploadProgress, setUploadProgress] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [publishedIdea, setPublishedIdea] = useState<Idea | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareLinkError, setShareLinkError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const writing = useRef(false);
  const tagOptions = useApiResource(getTags);
  const stageOptions = useApiResource(getStages);
  const screenshots = draft?.screenshots ?? [];
  const anonymousDemoActive = anonymousPreview !== 'off';

  useEffect(() => {
    if (publishedIdea && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [publishedIdea]);

  useEffect(() => {
    if (errors.server && !busy) errorRef.current?.focus();
  }, [errors.server, busy]);

  function goTo(next: WizardStep) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function write(task: () => Promise<void>, fallback: string) {
    if (writing.current || publishedIdea) return;
    writing.current = true;
    setBusy(true);
    setErrors({});
    try {
      await task();
    } catch (error) {
      setErrors({ server: apiErrorMessage(error, fallback) });
      if (error instanceof ApiError) {
        if (error.errors.basics?.length) goTo(1);
        else if (error.errors.mvpProof?.length) goTo(2);
        if (error.status === 401 || error.status === 403) await refreshSession();
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  function validateBasics() {
    const validation: Record<string, string> = {};
    if (!title.trim() || title.trim().length > 120) validation.title = 'Enter a title of 1 to 120 characters.';
    if (!elevatorPitch.trim() || elevatorPitch.trim().length > 300) validation.elevatorPitch = 'Enter an elevator pitch of 1 to 300 characters.';
    if (!problemStatement.trim() || problemStatement.trim().length > 2000) validation.problemStatement = 'Enter a problem statement of 1 to 2,000 characters.';
    if (!description.trim() || description.trim().length > 2000) validation.description = 'Enter a solution description of 1 to 2,000 characters.';
    setErrors(validation);
    return Object.keys(validation).length === 0;
  }

  async function handleNextFromStep1() {
    if (!validateBasics()) return;
    await write(async () => {
      let saved: Idea;
      try {
        saved = await saveBasics(draft?.id ?? null, {
          title: title.trim(),
          elevatorPitch: elevatorPitch.trim(),
          problemStatement: problemStatement.trim(),
          solutionDescription: description.trim(),
        });
      } catch (error) {
        if (!draft && error instanceof ApiError && error.status === undefined) {
          throw new ApiError(error.message + ' Check My Ideas for a saved draft before trying again.');
        }
        throw error;
      }
      setDraft(saved);
      if (!draft) router.replace('/publish?draft=' + saved.id + '&step=2', { scroll: false });
      else goTo(2);
    }, 'Could not save the draft.');
  }

  async function handleNextFromStep2() {
    if (!draft || !stage || industries.length < 1 || industries.length > 3) {
      setErrors({ server: 'Choose 1 to 3 tags and a development stage.' });
      return;
    }
    const link = mvpUrl.trim();
    if (link && !isValidMvpUrl(link)) {
      setErrors({ server: 'Enter a valid HTTP or HTTPS MVP link of at most 2,048 characters.' });
      return;
    }
    await write(async () => {
      const updated = await saveClassification(draft.id, { tags: industries, developmentStage: stage });
      setDraft(updated);
      if ((updated.mvpUrl ?? '') !== link) setDraft(await saveMvpLink(draft.id, link));
      goTo(3);
    }, 'Could not save the MVP and classification details.');
  }

  function handleToggleIndustry(tag: IdeaTag) {
    setIndustries((current) => current.includes(tag) ? current.filter((item) => item !== tag) :
      current.length < 3 ? [...current, tag] : current);
  }

  function toggleRole(role: UserRole) {
    setAllowedRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!draft || files.length === 0) return;
    if (screenshots.length + files.length > 5 || files.some((file) =>
      !imageTypes.includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) {
      setErrors({ server: 'Choose up to five PNG, JPG, or WebP files, each at most 5 MB.' });
      return;
    }

    await write(async () => {
      try {
        for (const [index, file] of files.entries()) {
          setUploadProgress(`Uploading screenshot ${index + 1} of ${files.length}…`);
          const uploaded = await uploadAttachment(draft.id, file);
          setDraft((current) => current && { ...current, screenshots: [...current.screenshots, uploaded] });
        }
      } catch (error) {
        const latest = await getIdea(draft.id).catch(() => null);
        if (latest) setDraft(latest);
        throw error;
      } finally {
        setUploadProgress('');
      }
    }, 'Could not upload the screenshots.');
  }

  async function handleRemoveImages(ids: string[]) {
    if (!draft) return;
    await write(async () => {
      try {
        for (const id of ids) {
          await removeAttachment(draft.id, id);
          setDraft((current) => current && { ...current, screenshots: current.screenshots.filter((image) => image.id !== id) });
        }
      } catch (error) {
        const latest = await getIdea(draft.id).catch(() => null);
        if (latest) setDraft(latest);
        throw error;
      }
    }, 'Could not remove the screenshots.');
  }

  async function handlePublish() {
    if (!draft || anonymousDemoActive) return;
    if (!agreedTerms || (feedbackEnabled && allowedRoles.length === 0)) {
      setErrors({ server: !agreedTerms ? 'Accept the publication declaration before publishing.' :
        'Select at least one commenter role or disable community feedback.' });
      return;
    }
    await write(async () => {
      try {
        setPublishedIdea(await publishIdea(draft.id, {
          visibility,
          feedbackEnabled,
          allowedCommenterRoles: feedbackEnabled ? allowedRoles : [],
          declarationAccepted: agreedTerms,
        }));
      } catch (error) {
        const latest = await getIdea(draft.id).catch(() => null);
        if (latest?.status === 'PUBLISHED') setPublishedIdea(latest);
        else throw error;
      }
    }, 'Could not publish the draft.');
  }

  async function handleCopyShareLink() {
    if (!publishedIdea) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + '/ideas/' + publishedIdea.id);
      setShareLinkError('');
      setCopiedLink(true);
    } catch {
      setShareLinkError('Could not copy the link. You can select and copy the address above.');
    }
  }

  const livePreviewIdea = {
    title: title.trim() || 'Your idea title',
    elevatorPitch: elevatorPitch.trim() || 'Your elevator pitch will appear here.',
    tags: industries,
    developmentStage: stage,
    founder: user,
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      <TopNav activeTab="my-ideas" />

      <main className="mx-auto max-w-[1440px] px-6 pt-[32px] lg:px-[120px]">
        {/* Page Header + Cancel Link */}
        <div className="mb-[24px] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] font-extrabold leading-[38px] tracking-[-0.8px] text-[#0f1b2d]">
              {initialDraft ? 'Edit your draft' : 'Publish your idea'}
            </h1>
            <p className="mt-[4px] font-sans text-[15px] text-[#64748b]">
              Share what you&apos;re building with UPM peers, professors, and early believers.
            </p>
          </div>

          <Link
            href="/my-ideas"
            className="inline-flex h-[38px] items-center rounded-[10px] border border-[#e4e9f0] bg-white px-[16px] font-sans text-[13px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
          >
            {draft ? 'Back to My Ideas' : 'Cancel'}
          </Link>
        </div>

        {/* 3-Step Horizontal Stepper Bar */}
        <div className="mb-[32px] flex flex-wrap items-center gap-[12px] rounded-[14px] border border-[#e4e9f0] bg-white p-[14px] shadow-sm">
          {[
            { num: 1 as WizardStep, label: 'Basics' },
            { num: 2 as WizardStep, label: 'MVP & proof' },
            { num: 3 as WizardStep, label: 'Review & publish' },
          ].map((item, idx) => {
            const isCurrent = step === item.num;
            const isDone = step > item.num;

            return (
              <React.Fragment key={item.num}>
                <button
                  type="button"
                  disabled={busy || item.num >= step}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => goTo(item.num)}
                  className="flex items-center gap-[10px] rounded-[10px] px-[10px] py-[6px] text-left transition-colors hover:bg-[#f4f7fa]"
                >
                  <span
                    className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold transition-colors ${
                      isDone
                        ? 'bg-[#16a34a] text-white'
                        : isCurrent
                        ? 'bg-[#4865ff] text-white'
                        : 'bg-[#e4e9f0] text-[#64748b]'
                    }`}
                  >
                    {isDone ? <IconCheck size={14} /> : item.num}
                  </span>
                  <span
                    className={`font-sans text-[14px] ${
                      isCurrent
                        ? 'font-bold text-[#0f1b2d]'
                        : isDone
                        ? 'font-semibold text-[#16a34a]'
                        : 'font-medium text-[#64748b]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>

                {idx < 2 && (
                  <div
                    className={`hidden sm:block h-[2px] flex-1 rounded-full ${
                      step > item.num ? 'bg-[#16a34a]' : 'bg-[#e4e9f0]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Main 2-Column Wizard Layout: Left Form (760px) + Right Live Preview (400px) */}
        <div className="grid grid-cols-1 items-start gap-[32px] lg:grid-cols-12">
          {/* LEFT COLUMN: Active Step Form */}
          <fieldset disabled={busy || !!publishedIdea} className="min-w-0 lg:col-span-8">
            {errors.server && <p ref={errorRef} role="alert" tabIndex={-1} className="mb-4 scroll-mt-32 rounded-[12px] border border-red-200 bg-white p-4 text-sm text-red-700">{errors.server}</p>}
            {/* ==================== STEP 1: BASICS ==================== */}
            {step === 1 && (
              <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[32px] shadow-card">
                <div className="mb-[24px] border-b border-[#e4e9f0] pb-[18px]">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#4865ff]">
                    STEP 1 OF 3 · BASICS
                  </span>
                  <h2 className="mt-1 font-display text-[22px] font-bold text-[#0f1b2d]">
                    Tell us about your idea
                  </h2>
                  <p className="mt-1 font-sans text-[14px] text-[#64748b]">
                    Start with a clear name, a one-sentence hook, and the problem you&apos;re
                    solving.
                  </p>
                </div>

                <div className="mb-[22px] flex items-start gap-[10px] rounded-[12px] border border-[#00adcc]/30 bg-[#e5f7fa]/60 p-[16px]">
                  <IconLock size={18} className="mt-0.5 shrink-0 text-[#00869e]" />
                  <div>
                    <h3 className="font-sans text-[13px] font-bold text-[#0f1b2d]">Draft access</h3>
                    <p className="mt-1 text-xs leading-[18px] text-[#334155]">
                      Continuing saves your draft on the server under My Ideas. The app shows drafts to their founders.
                      Review the audience and remove sensitive material before publishing.
                    </p>
                  </div>
                </div>

                <div className="space-y-[22px]">
                  {/* Idea Title */}
                  <div>
                    <div className="mb-[6px] flex items-center justify-between">
                      <label
                        htmlFor="idea-title"
                        className="font-sans text-[13px] font-bold text-[#0f1b2d]"
                      >
                        Idea title <span className="text-[#dc2626]">*</span>
                      </label>
                      <span className="font-sans text-[12px] text-[#64748b]">
                        {title.length} / 120
                      </span>
                    </div>
                    <input
                      id="idea-title"
                      type="text"
                      maxLength={120}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                      }}
                      placeholder="e.g., WattWise, SolarDrone, CampusLoop..."
                      className={`h-[44px] w-full rounded-[10px] border px-[14px] font-sans text-[14px] text-[#0f1b2d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 ${
                        errors.title
                          ? 'border-[#dc2626] focus:ring-[#dc2626]/20'
                          : 'border-[#e4e9f0] focus:border-[#4865ff] focus:ring-[#4865ff]/15'
                      }`}
                    />
                    {errors.title && (
                      <p className="mt-1.5 font-sans text-[12px] font-medium text-[#dc2626]">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Elevator Pitch */}
                  <div>
                    <div className="mb-[6px] flex items-center justify-between">
                      <label
                        htmlFor="elevator-pitch"
                        className="font-sans text-[13px] font-bold text-[#0f1b2d]"
                      >
                        Elevator pitch <span className="text-[#dc2626]">*</span>
                      </label>
                      <span className="font-sans text-[12px] text-[#64748b]">
                        {elevatorPitch.length} / 300
                      </span>
                    </div>
                    <input
                      id="elevator-pitch"
                      type="text"
                      maxLength={300}
                      value={elevatorPitch}
                      onChange={(e) => {
                        setElevatorPitch(e.target.value);
                        if (errors.elevatorPitch)
                          setErrors((prev) => ({ ...prev, elevatorPitch: '' }));
                      }}
                      placeholder="One crisp sentence shown on the Pitch Board card"
                      className={`h-[44px] w-full rounded-[10px] border px-[14px] font-sans text-[14px] text-[#0f1b2d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 ${
                        errors.elevatorPitch
                          ? 'border-[#dc2626] focus:ring-[#dc2626]/20'
                          : 'border-[#e4e9f0] focus:border-[#4865ff] focus:ring-[#4865ff]/15'
                      }`}
                    />
                    {errors.elevatorPitch && (
                      <p className="mt-1.5 font-sans text-[12px] font-medium text-[#dc2626]">
                        {errors.elevatorPitch}
                      </p>
                    )}
                  </div>

                  {/* Problem Statement */}
                  <div>
                    <div className="mb-[6px] flex items-center justify-between">
                      <label
                        htmlFor="problem-statement"
                        className="font-sans text-[13px] font-bold text-[#0f1b2d]"
                      >
                        Problem statement <span className="text-[#dc2626]">*</span>
                      </label>
                      <span className="font-sans text-[12px] text-[#64748b]">
                        Who has this problem and why now?
                      </span>
                    </div>
                    <textarea
                      id="problem-statement"
                      rows={4}
                      value={problemStatement}
                      maxLength={2000}
                      onChange={(e) => {
                        setProblemStatement(e.target.value);
                        if (errors.problemStatement)
                          setErrors((prev) => ({ ...prev, problemStatement: '' }));
                      }}
                      placeholder="Describe the pain point you observed and who experiences it..."
                      className={`w-full rounded-[10px] border p-[14px] font-sans text-[14px] leading-[21px] text-[#0f1b2d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 ${
                        errors.problemStatement
                          ? 'border-[#dc2626] focus:ring-[#dc2626]/20'
                          : 'border-[#e4e9f0] focus:border-[#4865ff] focus:ring-[#4865ff]/15'
                      }`}
                    />
                    {errors.problemStatement && (
                      <p className="mt-1.5 font-sans text-[12px] font-medium text-[#dc2626]">
                        {errors.problemStatement}
                      </p>
                    )}
                  </div>

                  {/* Description / Solution */}
                  <div>
                    <div className="mb-[6px] flex items-center justify-between">
                      <label
                        htmlFor="idea-description"
                        className="font-sans text-[13px] font-bold text-[#0f1b2d]"
                      >
                        Description &amp; solution <span className="text-[#dc2626]">*</span>
                      </label>
                      <span className="font-sans text-[12px] text-[#64748b]">
                        How does your product solve it?
                      </span>
                    </div>
                    <textarea
                      id="idea-description"
                      rows={5}
                      value={description}
                      maxLength={2000}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description)
                          setErrors((prev) => ({ ...prev, description: '' }));
                      }}
                      placeholder="Explain how your product works, key features, and what makes your approach unique..."
                      className={`w-full rounded-[10px] border p-[14px] font-sans text-[14px] leading-[21px] text-[#0f1b2d] placeholder:text-[#64748b] focus:outline-none focus:ring-2 ${
                        errors.description
                          ? 'border-[#dc2626] focus:ring-[#dc2626]/20'
                          : 'border-[#e4e9f0] focus:border-[#4865ff] focus:ring-[#4865ff]/15'
                      }`}
                    />
                    {errors.description && (
                      <p className="mt-1.5 font-sans text-[12px] font-medium text-[#dc2626]">
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 1 Footer */}
                <div className="mt-[28px] flex items-center justify-between border-t border-[#e4e9f0] pt-[20px]">
                  <span className="font-sans text-[12px] text-[#64748b]">
                    Step 1 of 3 · Required fields marked with *
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleNextFromStep1()}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] bg-[#4865ff] px-[24px] font-sans text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#3144aa]"
                  >
                    {busy ? 'Saving…' : 'Next: MVP & proof →'}
                  </button>
                </div>
              </div>
            )}

            {/* ==================== STEP 2: MVP & PROOF ==================== */}
            {step === 2 && (
              <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[32px] shadow-card">
                <div className="mb-[24px] border-b border-[#e4e9f0] pb-[18px]">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#4865ff]">
                    STEP 2 OF 3 · MVP &amp; PROOF
                  </span>
                  <h2 className="mt-1 font-display text-[22px] font-bold text-[#0f1b2d]">
                    Categorize &amp; showcase your progress
                  </h2>
                  <p className="mt-1 font-sans text-[14px] text-[#64748b]">
                    Select your industry, current development stage, and any optional prototype links.
                  </p>
                </div>

                <div className="space-y-[26px]">
                  {/* Industry / Category Selector */}
                  <div>
                    <div className="mb-[8px] flex items-center justify-between">
                      <label className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                        Industry / category
                      </label>
                      <span className="font-sans text-[12px] text-[#64748b]">
                        Choose 1 to 3 tags ({industries.length}/3 selected)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-[8px]">
                      {tagOptions.data?.map((category) => {
                        const isSelected = industries.includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleToggleIndustry(category)}
                            aria-pressed={isSelected}
                            disabled={!isSelected && industries.length >= 3}
                            className={`inline-flex items-center gap-[6px] rounded-full px-[14px] py-[8px] font-sans text-[13px] transition-all ${
                              isSelected
                                ? 'bg-[#0f1b2d] font-semibold text-white shadow-sm'
                                : 'border border-[#e4e9f0] bg-white font-medium text-[#334155] hover:border-[#4865ff] hover:text-[#4865ff]'
                            }`}
                          >
                            {isSelected && <IconCheck size={13} />}
                            <span>{TAG_LABELS[category]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Development Stage Selection */}
                  <div>
                    <label className="mb-[8px] block font-sans text-[13px] font-bold text-[#0f1b2d]">
                      Current development stage
                    </label>
                    <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-3">
                      {stageOptions.data?.map((value) => {
                        const isSelected = stage === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setStage(value)}
                            className={`flex flex-col items-start rounded-[12px] border p-[14px] text-left transition-all ${
                              isSelected
                                ? 'border-[2px] border-[#4865ff] bg-[#e8ebfe]/50'
                                : 'border-[#e4e9f0] bg-white hover:bg-[#f4f7fa]'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span
                                className={`font-display text-[15px] font-bold ${
                                  isSelected ? 'text-[#4865ff]' : 'text-[#0f1b2d]'
                                }`}
                              >
                                {STAGE_LABELS[value]}
                              </span>
                              {isSelected && (
                                <span className="h-2 w-2 rounded-full bg-[#4865ff]" />
                              )}
                            </div>
                            <span className="mt-1 font-sans text-[11px] text-[#64748b]">
                              {STAGE_DESCRIPTIONS[value]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {((tagOptions.error && !tagOptions.data) || (stageOptions.error && !stageOptions.data)) && (
                    <p role="alert" className="text-sm text-red-700">
                      Could not load tags or stages. <button type="button" className="underline" onClick={() => { tagOptions.reload(); stageOptions.reload(); }}>Try again</button>
                    </p>
                  )}
                  {(tagOptions.loading || stageOptions.loading) && <p role="status" className="text-sm text-[#64748b]">Loading tags and stages…</p>}

                  {/* Optional Prototype Images */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#0f1b2d]">Prototype images <span className="font-normal text-[#64748b]">(optional)</span></span>
                      {screenshots.length > 0 && (
                        <button type="button" onClick={() => void handleRemoveImages(screenshots.map((image) => image.id))}
                          className="text-xs font-semibold text-[#dc2626] hover:underline">Remove all</button>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFileUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={screenshots.length >= 5}
                      className="w-full rounded-[12px] border-2 border-dashed border-[#cbd5e1] bg-[#f4f7fa]/70 p-[20px] text-center transition-colors hover:border-[#4865ff] hover:bg-[#e8ebfe]/25 disabled:opacity-60">
                      <span className="flex flex-col items-center py-2">
                        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8ebfe] text-[#4865ff]"><IconUpload size={20} /></span>
                        <span className="text-[14px] font-semibold text-[#0f1b2d]">{screenshots.length >= 5 ? 'Screenshot limit reached' : 'Upload prototype images'}</span>
                        <span className="mt-0.5 text-xs text-[#64748b]">Up to 5 PNG, JPG, or WebP files, 5 MB each ({screenshots.length}/5)</span>
                      </span>
                    </button>
                    {uploadProgress && <p role="status" className="mt-2 text-xs text-[#334155]">{uploadProgress}</p>}
                    {screenshots.length > 1 && <p className="mt-2 text-xs text-[#64748b]">Select a thumbnail to preview it. The first screenshot is the Pitch Board cover.</p>}
                    <DraftScreenshotGallery screenshots={screenshots} onRemove={(id) => void handleRemoveImages([id])} />
                  </div>

                  {/* Optional MVP URL */}
                  <div>
                    <label
                      htmlFor="mvp-url"
                      className="mb-[6px] block font-sans text-[13px] font-bold text-[#0f1b2d]"
                    >
                      Link to your MVP or prototype{' '}
                      <span className="font-normal text-[#64748b]">(optional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="pointer-events-none absolute left-[14px] text-[#64748b]">
                        <IconLink size={16} />
                      </span>
                      <input
                        id="mvp-url"
                        type="url"
                        value={mvpUrl}
                        maxLength={2048}
                        onChange={(e) => setMvpUrl(e.target.value)}
                        placeholder="https://figma.com/... or https://your-demo.upm.es"
                        className="h-[44px] w-full rounded-[10px] border border-[#e4e9f0] pl-[38px] pr-[14px] font-sans text-[14px] text-[#0f1b2d] placeholder:text-[#64748b] focus:border-[#4865ff] focus:outline-none focus:ring-2 focus:ring-[#4865ff]/15"
                      />
                    </div>
                  </div>

                </div>

                {/* Step 2 Footer */}
                <div className="mt-[28px] flex items-center justify-between border-t border-[#e4e9f0] pt-[20px]">
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] border border-[#e4e9f0] bg-white px-[20px] font-sans text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleNextFromStep2()}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] bg-[#4865ff] px-[24px] font-sans text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#3144aa]"
                  >
                    {busy ? 'Saving…' : 'Next: Review & publish →'}
                  </button>
                </div>
              </div>
            )}

            {/* ==================== STEP 3: REVIEW & PUBLISH ==================== */}
            {step === 3 && (
              <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[32px] shadow-card">
                <div className="mb-[20px] border-b border-[#e4e9f0] pb-[18px]">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#16a34a]">
                    STEP 3 OF 3 · REVIEW &amp; PUBLISH
                  </span>
                  <h2 className="mt-1 font-display text-[22px] font-bold text-[#0f1b2d]">
                    Review &amp; publish your idea
                  </h2>
                  <p className="mt-1 font-sans text-[14px] text-[#64748b]">
                    Review your pitch, select who can view it, and confirm the publication declaration.
                  </p>
                </div>

                {/* Green Readiness Banner */}
                <div className="mb-[24px] rounded-[12px] border border-[#16a34a]/30 bg-[#e7f6ec] p-[16px]">
                  <div className="flex items-center gap-[8px] font-sans text-[13px] font-bold text-[#15803d]">
                    <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#16a34a] text-white">
                      <IconCheck size={12} />
                    </span>
                    <span>Draft details saved</span>
                  </div>
                  <div className="mt-[10px] flex flex-wrap gap-x-6 gap-y-2 pl-[28px] font-sans text-[12px] font-medium text-[#15803d]">
                    <span>✓ Basics &amp; problem statement</span>
                    <span>
                      ✓ Tags ({industries.map((tag) => TAG_LABELS[tag]).join(', ')}) &amp; Stage ({stage ? STAGE_LABELS[stage] : 'Pending'})
                    </span>
                    <span>
                      ✓ Publishing account ({user.fullName})
                    </span>
                  </div>
                </div>

                {/* Summary of Entered Information */}
                <div className="space-y-[16px] rounded-[14px] border border-[#e4e9f0] bg-[#f4f7fa] p-[20px]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4e9f0] pb-[12px]">
                    <div>
                      <span className="font-sans text-[11px] font-bold uppercase tracking-[0.8px] text-[#64748b]">
                        IDEA TITLE &amp; STAGE
                      </span>
                      <h3 className="mt-0.5 font-display text-[20px] font-bold text-[#0f1b2d]">
                        {title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-[6px]">
                      {industries.map((cat) => (
                        <Tag key={cat} category={cat} />
                      ))}
                      <span className="rounded-full bg-[#0f1b2d] px-[10px] py-[4px] font-sans text-[11px] font-semibold text-white">
                        {stage ? STAGE_LABELS[stage] : 'Stage pending'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-sans text-[11px] font-bold uppercase tracking-[0.8px] text-[#64748b]">
                      ELEVATOR PITCH
                    </span>
                    <p className="mt-1 font-sans text-[14px] font-medium text-[#0f1b2d]">
                      {elevatorPitch}
                    </p>
                  </div>

                  <div>
                    <span className="font-sans text-[11px] font-bold uppercase tracking-[0.8px] text-[#64748b]">
                      PROBLEM STATEMENT
                    </span>
                    <p className="mt-1 whitespace-pre-line font-sans text-[13px] leading-[20px] text-[#334155]">
                      {problemStatement}
                    </p>
                  </div>

                  <div>
                    <span className="font-sans text-[11px] font-bold uppercase tracking-[0.8px] text-[#64748b]">
                      SOLUTION DESCRIPTION
                    </span>
                    <p className="mt-1 whitespace-pre-line font-sans text-[13px] leading-[20px] text-[#334155]">
                      {description}
                    </p>
                  </div>

                  {mvpUrl.trim() && (
                    <div className="border-t border-[#e4e9f0] pt-[12px]">
                      <div className="font-sans text-[13px]">
                        <strong className="text-[#0f1b2d]">MVP URL: </strong>
                        <span className="text-[#4865ff]">{mvpUrl}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-[24px]">
                  <label className="mb-[10px] flex cursor-pointer items-center gap-2 text-[13px] font-bold text-[#0f1b2d]">
                    <input type="checkbox" checked={feedbackEnabled} onChange={(event) => setFeedbackEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-[#cbd5e1] text-[#4865ff]" />
                    Enable community feedback
                  </label>
                  {feedbackEnabled && (
                    <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2" aria-label="Who can give feedback">
                      {COMMENT_ROLES.map((role) => {
                        const checked = allowedRoles.includes(role);
                        return (
                          <button key={role} type="button" aria-pressed={checked} onClick={() => toggleRole(role)}
                            className={`flex items-center justify-between rounded-[12px] border p-[12px] text-left text-[13px] font-bold text-[#0f1b2d] ${checked ? 'border-[#4865ff]/40 bg-[#e8ebfe]/30' : 'border-[#e4e9f0] bg-white'}`}>
                            {ROLE_LABELS[role]}
                            <span aria-hidden="true" className={`flex h-5 w-9 items-center rounded-full p-0.5 ${checked ? 'bg-[#4865ff]' : 'bg-[#cbd5e1]'}`}>
                              <span className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Visibility selector */}
                <div className="mt-[20px]">
                  <h3 className="mb-[10px] font-sans text-[13px] font-bold text-[#0f1b2d]">
                    Who can see this idea
                  </h3>
                  <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={visibility === 'PUBLIC'}
                      onClick={() => setVisibility('PUBLIC')}
                      className={`flex items-start gap-[12px] rounded-[12px] border p-[14px] text-left transition-all ${
                        visibility === 'PUBLIC'
                          ? 'border-[2px] border-[#4865ff] bg-[#e8ebfe]/35'
                          : 'border-[#e4e9f0] bg-white'
                      }`}
                    >
                      <IconGlobe size={18} className="mt-0.5 shrink-0 text-[#4865ff]" />
                      <div>
                        <div className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                          Public on EDISON UPM
                        </div>
                        <div className="font-sans text-[12px] text-[#64748b]">
                          Visible to anyone on the Pitch Board.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-pressed={visibility === 'UPM_COMMUNITY'}
                      onClick={() => setVisibility('UPM_COMMUNITY')}
                      className={`flex items-start gap-[12px] rounded-[12px] border p-[14px] text-left transition-all ${
                        visibility === 'UPM_COMMUNITY'
                          ? 'border-[2px] border-[#4865ff] bg-[#e8ebfe]/35'
                          : 'border-[#e4e9f0] bg-white'
                      }`}
                    >
                      <IconLock size={18} className="mt-0.5 shrink-0 text-[#0f1b2d]" />
                      <div>
                        <div className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                          UPM Community Only
                        </div>
                        <div className="font-sans text-[12px] text-[#64748b]">
                          Visible to signed-in UPM students and professors.
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <AnonymousPublishingPreview mode={anonymousPreview} authorName={user.fullName} onChange={setAnonymousPreview} />

                {/* Community Guidelines Checkbox */}
                <label className="mt-[20px] flex cursor-pointer items-center gap-[10px] font-sans text-[13px] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="h-[16px] w-[16px] rounded border-[#cbd5e1] text-[#4865ff] focus:ring-[#4865ff]"
                  />
                  <span>
                    I confirm this is an original UPM student project and agree to constructive
                    community feedback.
                  </span>
                </label>

                <p id="publication-identity-note" aria-live="polite" className="mt-4 break-words rounded-[10px] bg-[#fff7da] px-3 py-2 text-sm text-[#334155]">
                  {anonymousDemoActive
                    ? 'Turn off the anonymous demo to publish.'
                    : <>Publishing displays your name, <strong>{user.fullName}</strong>, to the selected audience. The API also includes your account email for that audience.</>}
                </p>

                {/* Step 3 Footer */}
                <div className="mt-[28px] flex flex-wrap items-center justify-between gap-4 border-t border-[#e4e9f0] pt-[20px]">
                  <button
                    type="button"
                    onClick={() => goTo(2)}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] border border-[#e4e9f0] bg-white px-[20px] font-sans text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={() => void handlePublish()}
                    disabled={anonymousDemoActive}
                    aria-describedby="publication-identity-note"
                    className="inline-flex min-h-[48px] items-center justify-center gap-[8px] rounded-[10px] bg-[#e6c400] px-[22px] py-2 text-center font-sans text-[15px] font-bold text-[#0f1b2d] shadow-[0_8px_20px_rgba(230,196,0,0.35)] transition-all enabled:hover:-translate-y-[1px] enabled:hover:bg-[#ffcb22] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>{busy ? 'Publishing…' : 'Publish with my name'}</span>
                  </button>
                </div>
              </div>
            )}
          </fieldset>

          {/* RIGHT COLUMN: Live Preview Card + Community Tip */}
          <aside className="space-y-[20px] lg:col-span-4">
            <div>
              <div className="mb-[10px] flex items-center justify-between">
                <span className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#64748b]">
                  PITCH BOARD CARD PREVIEW
                </span>
                <span className="rounded-full bg-[#e8ebfe] px-[8px] py-[2px] font-sans text-[11px] font-semibold text-[#4865ff]">
                  {anonymousDemoActive ? 'Demo only' : 'Live preview'}
                </span>
              </div>

              <IdeaCard idea={livePreviewIdea} previewImage={screenshots[0] ? apiUrl(screenshots[0].url) : undefined}
                previewAuthor={anonymousPreview === 'anonymous' ? anonymousPreviewAuthor : undefined} isPreview />
            </div>

            {/* Contextual Community Tip Card */}
            <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[20px] shadow-card">
              <div className="mb-[8px] flex items-center gap-[8px] font-sans text-[12px] font-bold text-[#4865ff]">
                <IconBulb size={16} />
                <span>Tip from the UPM community</span>
              </div>
              <p className="font-sans text-[13px] leading-[20px] text-[#334155]">
                {step === 1 &&
                  'Use the elevator pitch to say who your idea helps and what it improves.'}
                {step === 2 &&
                  'Even an early Figma link or lab benchmark helps professors and fellow students give concrete technical feedback.'}
                {step === 3 &&
                  'Your idea appears on the Pitch Board for the audience you select.'}
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* ==================== SCREEN 10: PUBLISHED SUCCESS MODAL ==================== */}
      {publishedIdea && (
        <dialog
          ref={dialogRef}
          aria-labelledby="published-modal-title"
          onCancel={(event) => {
            event.preventDefault();
            router.replace(`/ideas/${publishedIdea.id}`);
          }}
          className="fixed inset-0 max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)] max-w-[540px] overflow-y-auto rounded-[24px] bg-transparent p-0 backdrop:bg-[#0f1b2d]/65 backdrop:backdrop-blur-sm"
        >
          <div className="relative w-full max-w-[540px] overflow-hidden rounded-[24px] border border-[#e4e9f0] bg-white p-[32px] text-center shadow-[0_24px_64px_rgba(15,27,45,0.35)]">
            {/* Decorative Confetti Dots */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around px-8 pt-3 opacity-80">
              <span className="h-2.5 w-2.5 rotate-12 rounded-sm bg-[#e6c400]" />
              <span className="h-2 w-2 rounded-full bg-[#4865ff]" />
              <span className="h-2.5 w-2.5 -rotate-12 rounded-sm bg-[#00adcc]" />
              <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
              <span className="h-2.5 w-2.5 rotate-45 rounded-sm bg-[#7403f4]" />
              <span className="h-2 w-2 rounded-full bg-[#ffcb22]" />
            </div>

            <button
              type="button"
              aria-label="Close modal"
              onClick={() => router.replace(`/ideas/${publishedIdea.id}`)}
              className="absolute right-[18px] top-[18px] flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#64748b] hover:bg-[#f4f7fa] hover:text-[#0f1b2d]"
            >
              <IconClose size={16} />
            </button>

            {/* Big Green Check Circle */}
            <div className="mx-auto mb-[18px] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#e7f6ec] text-[#16a34a] ring-8 ring-[#e7f6ec]/50">
              <IconCheck size={34} />
            </div>

            <span className="inline-block rounded-full bg-[#e8ebfe] px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#4865ff]">
              PUBLISHED
            </span>

            <h2
              id="published-modal-title"
              className="mt-[10px] font-display text-[30px] font-extrabold leading-[36px] tracking-[-0.6px] text-[#0f1b2d]"
            >
              Your idea is published!
            </h2>

            <p className="mx-auto mt-[8px] max-w-[420px] font-sans text-[14px] leading-[21px] text-[#334155]">
              <strong className="text-[#0f1b2d]">{publishedIdea.title}</strong> is now visible on the Pitch Board to {publishedIdea.visibility === 'PUBLIC' ? 'everyone' : 'signed-in UPM students and professors'}.
            </p>

            {/* Published Idea Link */}
            <div className="mt-[20px] flex items-center justify-between gap-2 rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] px-[14px] py-[10px]">
              <span className="truncate font-sans text-[13px] font-medium text-[#334155]">
                {window.location.origin}/ideas/{publishedIdea.id}
              </span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="shrink-0 rounded-[8px] bg-white px-[12px] py-[6px] font-sans text-[12px] font-bold text-[#4865ff] shadow-sm transition-colors hover:bg-[#e8ebfe]"
              >
                {copiedLink ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            {shareLinkError && (
              <p role="alert" className="mt-2 text-left font-sans text-[12px] font-medium text-[#dc2626]">
                {shareLinkError}
              </p>
            )}

            {/* Primary & Secondary Action Buttons */}
            <div className="mt-[24px] flex flex-col gap-[10px] sm:flex-row">
              <Link
                href="/pitch-board"
                className="inline-flex h-[46px] flex-1 items-center justify-center rounded-[10px] border border-[#e4e9f0] bg-white px-[18px] font-sans text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
              >
                Back to Pitch Board
              </Link>
              <Link
                href={`/ideas/${publishedIdea.id}`}
                className="inline-flex h-[46px] flex-1 items-center justify-center rounded-[10px] bg-[#4865ff] px-[18px] font-sans text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#3144aa]"
              >
                View my idea →
              </Link>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

function isValidMvpUrl(value: string): boolean {
  if (value.length > 2048 || !/^https?:\/\/\S+$/i.test(value)) return false;
  try {
    return Boolean(new URL(value).hostname);
  } catch {
    return false;
  }
}
