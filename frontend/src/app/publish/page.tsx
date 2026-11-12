'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { TopNav } from '@/components/layout/TopNav';
import { IdeaCard } from '@/components/pitch-board/IdeaCard';
import { Tag } from '@/components/ui/Tag';
import {
  IconCheck,
  IconUpload,
  IconLink,
  IconBulb,
  IconGlobe,
  IconLock,
  IconClose,
} from '@/components/ui/Icons';
import { INDUSTRY_CATEGORIES, DEMO_FOUNDER } from '@/data/mockData';
import { savePublishedIdea } from '@/utils/storage';
import { Idea, IdeaStage, IndustryCategory } from '@/types';

type WizardStep = 1 | 2 | 3;

const STAGES: { value: IdeaStage; label: string; sub: string }[] = [
  { value: 'Idea', label: 'Idea', sub: 'Concept & research' },
  { value: 'Prototype', label: 'Prototype', sub: 'Clickable / lab build' },
  { value: 'MVP', label: 'MVP', sub: 'Working product' },
  { value: 'Traction', label: 'Traction', sub: 'Active users / pilots' },
];

export default function PublishIdeaPage() {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 — Basics (required)
  const [title, setTitle] = useState('');
  const [elevatorPitch, setElevatorPitch] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — MVP & Proof
  const [industries, setIndustries] = useState<IndustryCategory[]>(['Green Tech']);
  const [stage, setStage] = useState<IdeaStage>('MVP');
  const [mvpUrl, setMvpUrl] = useState('');
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [coverFileNames, setCoverFileNames] = useState<string[]>([]);
  const [imageError, setImageError] = useState('');

  // Step 3 — Review & Publish toggles
  const [allowPeers, setAllowPeers] = useState(true);
  const [allowProfessors, setAllowProfessors] = useState(true);
  const [allowInvestors, setAllowInvestors] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'upm'>('public');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Validation & Modal state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishedIdea, setPublishedIdea] = useState<Idea | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareLinkError, setShareLinkError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateStep1 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = 'Idea title is required.';
    }
    if (!elevatorPitch.trim()) {
      nextErrors.elevatorPitch = 'Elevator pitch is required.';
    }
    if (!problemStatement.trim()) {
      nextErrors.problemStatement = 'Problem statement is required.';
    }
    if (!description.trim()) {
      nextErrors.description = 'Description / solution is required.';
    }
    if (!privacyAcknowledged) {
      nextErrors.privacyAcknowledged = 'Please review and acknowledge how this prototype stores your idea.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextFromStep2 = () => {
    if (industries.length === 0) {
      setIndustries(['Green Tech']);
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleIndustry = (category: IndustryCategory) => {
    setIndustries((prev) => {
      if (prev.includes(category)) {
        // Keep at least 1 selected category
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== category);
      }
      // Cap at 2 categories like Figma design ("Pick up to 2")
      if (prev.length >= 2) {
        return [prev[1], category];
      }
      return [...prev, category];
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    if (files.some((file) => !file.type.startsWith('image/'))) {
      setImageError('Please choose image files only.');
      return;
    }

    try {
      const images = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') resolve(reader.result);
                else reject(new Error('Could not read the selected image.'));
              };
              reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
              reader.readAsDataURL(file);
            })
        )
      );
      setCoverImages((previous) => [...previous, ...images]);
      setCoverFileNames((previous) => [...previous, ...files.map((file) => file.name)]);
      setImageError('');
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not read the selected images.');
    }
  };

  const handlePublish = () => {
    if (!validateStep1()) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const created = savePublishedIdea({
        title,
        elevatorPitch,
        problemStatement,
        description,
        industries: industries.length > 0 ? industries : ['Green Tech'],
        stage,
        mvpUrl,
        coverImages,
        isAnonymous,
      });
      setErrors((previous) => ({ ...previous, publish: '' }));
      setPublishedIdea(created);
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        publish: error instanceof Error ? error.message : 'Your idea could not be published.',
      }));
    }
  };

  const handleCopyShareLink = async () => {
    if (!publishedIdea) return;
    const shareText = `${window.location.origin}/ideas/${publishedIdea.slug}`;
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard access is not available in this browser.');
      }
      await navigator.clipboard.writeText(shareText);
      setShareLinkError('');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (error) {
      setShareLinkError(
        error instanceof Error ? error.message : 'The local link could not be copied.'
      );
    }
  };

  // Build live preview Idea object from current form state
  const livePreviewIdea: Idea = {
    id: 'preview',
    slug: 'preview',
    title: title.trim() || 'Your idea title',
    elevatorPitch:
      elevatorPitch.trim() ||
      'A crisp one-sentence pitch explaining what you are building and who it helps.',
    problemStatement: problemStatement.trim() || 'Problem statement preview',
    description: description.trim() || 'Solution description preview',
    industries: industries.length > 0 ? industries : ['Green Tech'],
    stage,
    stageLabel: stage === 'MVP' ? 'MVP live' : stage,
    mvpUrl: mvpUrl.trim() || undefined,
    coverImage: coverImages[0],
    coverImages,
    metrics: [],
    lookingFor: ['Pricing feedback', 'Early testers', 'Seed funding'],
    founder: DEMO_FOUNDER,
    isAnonymous,
    createdAt: new Date().toISOString(),
    viewsCount: 1,
    savesCount: 0,
    helpfulCount: 0,
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      <TopNav activeTab="my-ideas" />

      <main className="mx-auto max-w-[1440px] px-6 pt-[32px] lg:px-[120px]">
        {/* Page Header + Cancel Link */}
        <div className="mb-[24px] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] font-extrabold leading-[38px] tracking-[-0.8px] text-[#0f1b2d]">
              Publish your idea
            </h1>
            <p className="mt-[4px] font-sans text-[15px] text-[#64748b]">
              Share what you&apos;re building with UPM peers, professors, and early believers.
            </p>
          </div>

          <Link
            href="/pitch-board"
            className="inline-flex h-[38px] items-center rounded-[10px] border border-[#e4e9f0] bg-white px-[16px] font-sans text-[13px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
          >
            Cancel
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
                  onClick={() => {
                    if (item.num === 1) setStep(1);
                    if (item.num === 2 && validateStep1()) setStep(2);
                    if (item.num === 3 && validateStep1()) setStep(3);
                  }}
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
          <div className="lg:col-span-8">
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

                <div className="mb-[22px] rounded-[12px] border border-[#00adcc]/30 bg-[#e5f7fa]/60 p-[16px]">
                  <div className="flex items-start gap-[10px]">
                    <IconLock size={18} className="mt-0.5 shrink-0 text-[#00869e]" />
                    <div>
                      <h3 className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                        Your idea stays in this browser in this prototype
                      </h3>
                      <p className="mt-1 font-sans text-[12px] leading-[18px] text-[#334155]">
                        Ideas and images are saved in this browser&apos;s local storage. This demo
                        does not send them to external parties or a shared server. That also means
                        a shared link will only work in this browser; the audience controls below
                        do not provide real access control.
                      </p>
                    </div>
                  </div>
                  <label className="mt-[12px] flex cursor-pointer items-start gap-[9px] font-sans text-[12px] font-medium text-[#0f1b2d]">
                    <input
                      type="checkbox"
                      checked={privacyAcknowledged}
                      onChange={(e) => {
                        setPrivacyAcknowledged(e.target.checked);
                        if (e.target.checked) {
                          setErrors((previous) => ({ ...previous, privacyAcknowledged: '' }));
                        }
                      }}
                      className="mt-0.5 h-[16px] w-[16px] shrink-0 rounded border-[#cbd5e1] text-[#4865ff] focus:ring-[#4865ff]"
                    />
                    <span>I understand how this prototype stores my idea before continuing.</span>
                  </label>
                  {errors.privacyAcknowledged && (
                    <p className="mt-1.5 font-sans text-[12px] font-medium text-[#dc2626]">
                      {errors.privacyAcknowledged}
                    </p>
                  )}
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
                        {title.length} / 60
                      </span>
                    </div>
                    <input
                      id="idea-title"
                      type="text"
                      maxLength={60}
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
                        {elevatorPitch.length} / 140
                      </span>
                    </div>
                    <input
                      id="elevator-pitch"
                      type="text"
                      maxLength={140}
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
                    onClick={handleNextFromStep1}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] bg-[#4865ff] px-[24px] font-sans text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#3144aa]"
                  >
                    Next: MVP &amp; proof →
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
                        Pick up to 2 categories ({industries.length}/2 selected)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-[8px]">
                      {INDUSTRY_CATEGORIES.map((category) => {
                        const isSelected = industries.includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleToggleIndustry(category)}
                            className={`inline-flex items-center gap-[6px] rounded-full px-[14px] py-[8px] font-sans text-[13px] transition-all ${
                              isSelected
                                ? 'bg-[#0f1b2d] font-semibold text-white shadow-sm'
                                : 'border border-[#e4e9f0] bg-white font-medium text-[#334155] hover:border-[#4865ff] hover:text-[#4865ff]'
                            }`}
                          >
                            {isSelected && <IconCheck size={13} />}
                            <span>{category}</span>
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
                    <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-4">
                      {STAGES.map((item) => {
                        const isSelected = stage === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setStage(item.value)}
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
                                {item.label}
                              </span>
                              {isSelected && (
                                <span className="h-2 w-2 rounded-full bg-[#4865ff]" />
                              )}
                            </div>
                            <span className="mt-1 font-sans text-[11px] text-[#64748b]">
                              {item.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Prototype Images */}
                  <div>
                    <div className="mb-[8px] flex items-center justify-between">
                      <label className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                        Prototype images{' '}
                        <span className="font-normal text-[#64748b]">(optional)</span>
                      </label>
                      {coverImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImages([]);
                            setCoverFileNames([]);
                            setImageError('');
                          }}
                          className="font-sans text-[12px] font-semibold text-[#dc2626] hover:underline"
                        >
                          Remove all
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      className="cursor-pointer rounded-[12px] border-2 border-dashed border-[#cbd5e1] bg-[#f4f7fa]/70 p-[20px] text-center transition-colors hover:border-[#4865ff] hover:bg-[#e8ebfe]/25"
                    >
                      <div className="flex flex-col items-center py-2">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8ebfe] text-[#4865ff]">
                          <IconUpload size={20} />
                        </div>
                        <p className="font-sans text-[14px] font-semibold text-[#0f1b2d]">
                          {coverImages.length ? 'Add more prototype images' : 'Upload prototype images'}
                        </p>
                        <p className="mt-0.5 font-sans text-[12px] text-[#64748b]">
                          Select multiple PNG, JPG, WebP or other image files
                        </p>
                      </div>
                    </div>

                    {imageError && (
                      <p className="mt-2 font-sans text-[12px] font-medium text-[#dc2626]">
                        {imageError}
                      </p>
                    )}

                    {coverImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {coverImages.map((image, index) => (
                          <div key={`${coverFileNames[index]}-${index}`} className="relative">
                            <img
                              src={image}
                              alt={`Prototype image ${index + 1}`}
                              className="h-[110px] w-full rounded-[10px] object-cover"
                            />
                            <span className="mt-1 block truncate font-sans text-[11px] text-[#64748b]">
                              {coverFileNames[index] || `Image ${index + 1}`}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove ${coverFileNames[index] || `image ${index + 1}`}`}
                              onClick={() => {
                                setCoverImages((previous) => previous.filter((_, i) => i !== index));
                                setCoverFileNames((previous) => previous.filter((_, i) => i !== index));
                              }}
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#0f1b2d]/80 text-white hover:bg-[#0f1b2d]"
                            >
                              <IconClose size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {coverImages.length === 0 && (
                      <div className="mt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImages(['/assets/wattwise-cover.png']);
                            setCoverFileNames(['sample-mvp-dashboard.png']);
                          }}
                          className="font-sans text-[12px] font-semibold text-[#4865ff] hover:underline"
                        >
                          Use sample UPM hardware/dashboard cover
                        </button>
                      </div>
                    )}
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
                    onClick={() => setStep(1)}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] border border-[#e4e9f0] bg-white px-[20px] font-sans text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextFromStep2}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] bg-[#4865ff] px-[24px] font-sans text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#3144aa]"
                  >
                    Next: Review &amp; publish →
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
                    Review &amp; save your idea
                  </h2>
                  <p className="mt-1 font-sans text-[14px] text-[#64748b]">
                    Review your pitch summary below. Your idea will be saved only in this browser.
                  </p>
                </div>

                {/* Green Readiness Banner */}
                <div className="mb-[24px] rounded-[12px] border border-[#16a34a]/30 bg-[#e7f6ec] p-[16px]">
                  <div className="flex items-center gap-[8px] font-sans text-[13px] font-bold text-[#15803d]">
                    <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#16a34a] text-white">
                      <IconCheck size={12} />
                    </span>
                    <span>All required fields complete — ready to save locally!</span>
                  </div>
                  <div className="mt-[10px] flex flex-wrap gap-x-6 gap-y-2 pl-[28px] font-sans text-[12px] font-medium text-[#15803d]">
                    <span>✓ Basics &amp; problem statement</span>
                    <span>
                      ✓ Category ({industries.join(', ')}) &amp; Stage ({stage})
                    </span>
                    <span>
                      ✓ Founder profile ({isAnonymous ? 'Anonymous founder' : DEMO_FOUNDER.name})
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
                        {stage}
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

                {/* Who can give feedback toggles (from Figma Screen 09) */}
                <div className="mt-[24px]">
                  <h3 className="mb-[10px] font-sans text-[13px] font-bold text-[#0f1b2d]">
                    Who can give feedback
                  </h3>
                  <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
                    {[
                      {
                        label: 'UPM Peers',
                        sub: 'Students & researchers',
                        checked: allowPeers,
                        toggle: () => setAllowPeers((v) => !v),
                      },
                      {
                        label: 'Professors',
                        sub: 'Faculty & lab mentors',
                        checked: allowProfessors,
                        toggle: () => setAllowProfessors((v) => !v),
                      },
                      {
                        label: 'Guest Investors',
                        sub: 'ActúaUPM & angels',
                        checked: allowInvestors,
                        toggle: () => setAllowInvestors((v) => !v),
                      },
                    ].map((row) => (
                      <button
                        key={row.label}
                        type="button"
                        onClick={row.toggle}
                        className={`flex items-center justify-between rounded-[12px] border p-[12px] text-left transition-colors ${
                          row.checked
                            ? 'border-[#4865ff]/40 bg-[#e8ebfe]/30'
                            : 'border-[#e4e9f0] bg-white'
                        }`}
                      >
                        <div>
                          <div className="font-sans text-[13px] font-bold text-[#0f1b2d]">
                            {row.label}
                          </div>
                          <div className="font-sans text-[11px] text-[#64748b]">{row.sub}</div>
                        </div>
                        <span
                          className={`flex h-[20px] w-[36px] items-center rounded-full p-[2px] transition-colors ${
                            row.checked ? 'bg-[#4865ff]' : 'bg-[#cbd5e1]'
                          }`}
                        >
                          <span
                            className={`h-[16px] w-[16px] rounded-full bg-white transition-transform ${
                              row.checked ? 'translate-x-[16px]' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-[24px] rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] p-[16px]">
                  <label className="flex cursor-pointer items-start gap-[10px]">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="mt-0.5 h-[16px] w-[16px] shrink-0 rounded border-[#cbd5e1] text-[#4865ff] focus:ring-[#4865ff]"
                    />
                    <span>
                      <span className="block font-sans text-[13px] font-bold text-[#0f1b2d]">
                        Publish anonymously
                      </span>
                      <span className="mt-1 block font-sans text-[12px] leading-[18px] text-[#64748b]">
                        Your name, profile and bio will be hidden on the idea card and detail page.
                        You can reveal your name later from that page in this browser. This demo
                        has no account system, so this is not secure against other people using
                        the same browser.
                      </span>
                    </span>
                  </label>
                </div>

                {/* Visibility selector */}
                <div className="mt-[20px]">
                  <h3 className="mb-[10px] font-sans text-[13px] font-bold text-[#0f1b2d]">
                    Intended audience (demo setting)
                  </h3>
                  <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`flex items-start gap-[12px] rounded-[12px] border p-[14px] text-left transition-all ${
                        visibility === 'public'
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
                          Intended for the main Pitch Board (not enforced in this demo).
                        </div>
                        <p className="mt-2 font-sans text-[11px] leading-[16px] text-[#64748b]">
                          These options are illustrative only; this browser-only prototype does not
                          enforce audience restrictions.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibility('upm')}
                      className={`flex items-start gap-[12px] rounded-[12px] border p-[14px] text-left transition-all ${
                        visibility === 'upm'
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
                          Intended for UPM users (not enforced in this demo).
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

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

                {/* Step 3 Footer */}
                <div className="mt-[28px] flex flex-wrap items-center justify-between gap-4 border-t border-[#e4e9f0] pt-[20px]">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex h-[44px] items-center justify-center rounded-[10px] border border-[#e4e9f0] bg-white px-[20px] font-sans text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]"
                  >
                    ← Back
                  </button>

                  {errors.publish && (
                    <p role="alert" className="w-full font-sans text-[13px] font-medium text-[#dc2626]">
                      {errors.publish}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handlePublish}
                    className="inline-flex h-[48px] items-center justify-center gap-[8px] rounded-[10px] bg-[#e6c400] px-[28px] font-sans text-[15px] font-bold text-[#0f1b2d] shadow-[0_8px_20px_rgba(230,196,0,0.35)] transition-all hover:-translate-y-[1px] hover:bg-[#ffcb22]"
                  >
                    <span>Publish idea 🚀</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Live Preview Card + Community Tip */}
          <aside className="space-y-[20px] lg:col-span-4">
            <div>
              <div className="mb-[10px] flex items-center justify-between">
                <span className="font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#64748b]">
                  LIVE PREVIEW ON THE PITCH BOARD
                </span>
                <span className="rounded-full bg-[#e8ebfe] px-[8px] py-[2px] font-sans text-[11px] font-semibold text-[#4865ff]">
                  Live sync
                </span>
              </div>

              <IdeaCard idea={livePreviewIdea} commentCount={0} isPreview />
            </div>

            {/* Contextual Community Tip Card */}
            <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-[20px] shadow-card">
              <div className="mb-[8px] flex items-center gap-[8px] font-sans text-[12px] font-bold text-[#4865ff]">
                <IconBulb size={16} />
                <span>Tip from the UPM community</span>
              </div>
              <p className="font-sans text-[13px] leading-[20px] text-[#334155]">
                {step === 1 &&
                  'Ideas with a specific, quantifiable elevator pitch (who it helps + measurable outcome) receive 2.4× more peer reviews from UPM mentors.'}
                {step === 2 &&
                  'Even an early Figma link or lab benchmark helps professors and fellow students give concrete technical feedback.'}
                {step === 3 &&
                  'This prototype saves your idea only in this browser; it is not shared with classmates or a live Pitch Board.'}
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* ==================== SCREEN 10: PUBLISHED SUCCESS MODAL ==================== */}
      {publishedIdea && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="published-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/65 p-4 backdrop-blur-sm"
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
              onClick={() => setPublishedIdea(null)}
              className="absolute right-[18px] top-[18px] flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#64748b] hover:bg-[#f4f7fa] hover:text-[#0f1b2d]"
            >
              <IconClose size={16} />
            </button>

            {/* Big Green Check Circle */}
            <div className="mx-auto mb-[18px] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#e7f6ec] text-[#16a34a] ring-8 ring-[#e7f6ec]/50">
              <IconCheck size={34} />
            </div>

            <span className="inline-block rounded-full bg-[#e8ebfe] px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[1px] text-[#4865ff]">
              SAVED IN THIS BROWSER
            </span>

            <h2
              id="published-modal-title"
              className="mt-[10px] font-display text-[30px] font-extrabold leading-[36px] tracking-[-0.6px] text-[#0f1b2d]"
            >
              Your idea is saved! 🎉
            </h2>

            <p className="mx-auto mt-[8px] max-w-[420px] font-sans text-[14px] leading-[21px] text-[#334155]">
              <strong className="text-[#0f1b2d]">{publishedIdea.title}</strong> is saved in this
              browser. This prototype does not publish it to a shared Pitch Board or make it
              available to other people through a link.
            </p>

            {/* Browser-local Idea Link */}
            <div className="mt-[20px] flex items-center justify-between gap-2 rounded-[12px] border border-[#e4e9f0] bg-[#f4f7fa] px-[14px] py-[10px]">
              <span className="truncate font-sans text-[13px] font-medium text-[#334155]">
                {window.location.origin}/ideas/{publishedIdea.slug}
              </span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="shrink-0 rounded-[8px] bg-white px-[12px] py-[6px] font-sans text-[12px] font-bold text-[#4865ff] shadow-sm transition-colors hover:bg-[#e8ebfe]"
              >
                {copiedLink ? 'Copied!' : 'Copy local link'}
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
                href={`/ideas/${publishedIdea.slug}`}
                className="inline-flex h-[46px] flex-1 items-center justify-center rounded-[10px] bg-[#4865ff] px-[18px] font-sans text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#3144aa]"
              >
                View my idea →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
