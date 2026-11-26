'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { Chip } from '@/components/ui/Chip';
import type { DevelopmentStage, IdeaTag } from '@/types';
import { getTags } from '@/utils/ideas';
import {
  DEFAULT_INVESTOR_PREFERENCES, investorPreferencesHref, readInvestorPreferences,
  type HelpType, type InvestorPreferences, type TicketSize,
} from '@/utils/investorMatching';
import { STAGE_LABELS, TAG_LABELS } from '@/utils/ideaDisplay';
import { loginHref } from '@/utils/loginNavigation';
import { useApiResource } from '@/utils/useApiResource';

const ticketOptions: { value: TicketSize; label: string }[] = [
  { value: 'UNDER_10K', label: 'Under €10k' },
  { value: '10K_50K', label: '€10k – €50k' },
  { value: '50K_150K', label: '€50k – €150k' },
  { value: 'OVER_150K', label: '€150k+' },
];

const helpOptions: { value: HelpType; label: string }[] = [
  { value: 'FUNDING', label: 'Funding' },
  { value: 'MENTORING', label: 'Mentoring' },
  { value: 'PILOT_CUSTOMER', label: 'Pilot customer' },
  { value: 'NETWORKING', label: 'Networking' },
];

const stageOptions: DevelopmentStage[] = ['CONCEPT', 'PROTOTYPE', 'MVP_LIVE'];
const choiceGroup = 'border-b border-[#e4e9f0] py-5 first:pt-0 last:border-0 last:pb-0';
const actionButton = 'inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#4865ff] px-5 text-sm font-bold text-white hover:bg-[#3144aa] disabled:cursor-not-allowed disabled:opacity-50';

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function InvestorInterestsPage() {
  const { user, isRestoring } = useAuth();
  const router = useRouter();
  const tags = useApiResource(getTags);
  const [preferences, setPreferences] = useState<InvestorPreferences>(DEFAULT_INVESTOR_PREFERENCES);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sort') === 'match') setPreferences(readInvestorPreferences(params));
  }, []);

  if (isRestoring) {
    return <><TopNav activeTab="pitch-board" /><main className="mx-auto max-w-[760px] px-6 py-10"><p role="status">Loading your account…</p></main></>;
  }
  if (!user) {
    return (
      <>
        <TopNav activeTab="pitch-board" />
        <main className="mx-auto max-w-[760px] px-6 py-10">
          <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-8 text-sm text-[#334155]">
            <Link href={loginHref('/investor-interests')} className="font-semibold text-[#4865ff] underline">Sign in</Link> as an investor to set your interests.
          </div>
        </main>
      </>
    );
  }
  if (user.role !== 'INVESTOR') {
    return (
      <>
        <TopNav activeTab="pitch-board" />
        <main className="mx-auto max-w-[760px] px-6 py-10">
          <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-8 text-sm text-[#334155]">
            This matchmaking setup is available to investor accounts. <Link href="/pitch-board" className="font-semibold text-[#4865ff] underline">Return to the Pitch Board</Link>.
          </div>
        </main>
      </>
    );
  }

  function showMatches() {
    if (preferences.tags.length === 0 && preferences.stages.length === 0) {
      setValidationError('Select at least one industry or stage to find relevant ideas.');
      return;
    }
    router.push(investorPreferencesHref('/pitch-board', preferences));
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <TopNav activeTab="pitch-board" />
      <main className="mx-auto max-w-[760px] px-6 py-8 sm:py-12">
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[1.1px] text-[#4865ff]">Investor setup · Takes 1 minute</p>
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.6px] text-[#0f1b2d] sm:text-[36px]">What are you looking to fund?</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">Choose the sectors and stages you want to explore. You can change your interests anytime.</p>
          <p className="mt-1 text-xs leading-5 text-[#64748b]">Matches are ranked by industry and stage for now. Ticket size and support preferences are saved with this search but do not affect the ranking yet.</p>
        </div>

        <div className="rounded-[18px] border border-[#e4e9f0] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,27,45,0.06)] sm:px-6 sm:py-6">
          <section className={choiceGroup} aria-labelledby="industries-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="industries-heading" className="text-sm font-bold text-[#0f1b2d]">Industries</h2>
                <p className="mt-0.5 text-xs text-[#64748b]">These are the same tags founders add to their ideas.</p>
              </div>
              <span className="text-xs font-medium text-[#4865ff]">{preferences.tags.length} selected</span>
            </div>
            {tags.error ? (
              <p role="alert" className="text-sm text-red-700">Could not load industries. <button type="button" onClick={tags.reload} className="underline">Try again</button></p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(tags.data ?? []).map((tag: IdeaTag) => (
                  <Chip key={tag} label={TAG_LABELS[tag]} selected={preferences.tags.includes(tag)}
                    onClick={() => setPreferences((current) => ({ ...current, tags: toggleValue(current.tags, tag) }))} />
                ))}
              </div>
            )}
          </section>

          <section className={choiceGroup} aria-labelledby="stage-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="stage-heading" className="text-sm font-bold text-[#0f1b2d]">Stage</h2>
                <p className="mt-0.5 text-xs text-[#64748b]">How far along should the idea be?</p>
              </div>
              <span className="text-xs font-medium text-[#4865ff]">{preferences.stages.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stageOptions.map((stage) => (
                <Chip key={stage} label={STAGE_LABELS[stage]} selected={preferences.stages.includes(stage)}
                  onClick={() => setPreferences((current) => ({ ...current, stages: toggleValue(current.stages, stage) }))} />
              ))}
            </div>
          </section>

          <section className={choiceGroup} aria-labelledby="ticket-heading">
            <div className="mb-3">
              <h2 id="ticket-heading" className="text-sm font-bold text-[#0f1b2d]">Ticket size</h2>
              <p className="mt-0.5 text-xs text-[#64748b]">Your typical first cheque.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ticketOptions.map((option) => (
                <Chip key={option.value} label={option.label} selected={preferences.ticketSize === option.value}
                  onClick={() => setPreferences((current) => ({ ...current, ticketSize: option.value }))} />
              ))}
            </div>
          </section>

          <section className={choiceGroup} aria-labelledby="help-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="help-heading" className="text-sm font-bold text-[#0f1b2d]">How you&apos;d like to help</h2>
                <p className="mt-0.5 text-xs text-[#64748b]">Choose the ways you&apos;d be open to supporting a team.</p>
              </div>
              <span className="text-xs font-medium text-[#4865ff]">{preferences.helpTypes.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {helpOptions.map((option) => (
                <Chip key={option.value} label={option.label} selected={preferences.helpTypes.includes(option.value)}
                  onClick={() => setPreferences((current) => ({ ...current, helpTypes: toggleValue(current.helpTypes, option.value) }))} />
              ))}
            </div>
          </section>

          {validationError && <p role="alert" className="mt-4 text-sm text-red-700">{validationError}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link href="/pitch-board" className="inline-flex min-h-[44px] items-center px-4 text-sm font-semibold text-[#334155] hover:text-[#4865ff]">Skip for now</Link>
            <button type="button" className={actionButton} onClick={showMatches} disabled={tags.loading}>
              Show my matches <span aria-hidden="true" className="ml-2">→</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
