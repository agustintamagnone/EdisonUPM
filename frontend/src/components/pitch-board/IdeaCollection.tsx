'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { IdeaCard } from '@/components/pitch-board/IdeaCard';
import { ApiError, apiErrorMessage } from '@/utils/api';
import { archiveIdea, getMyIdeas } from '@/utils/ideas';
import { loginHref } from '@/utils/loginNavigation';
import { useApiResource } from '@/utils/useApiResource';
import { useSavedIdeas } from '@/utils/useSavedIdeas';

const buttonStyle = 'inline-flex items-center justify-center rounded-[10px] border border-[#e4e9f0] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f4f7fa] disabled:opacity-50';

export function IdeaCollection({ kind }: { kind: 'mine' | 'saved' }) {
  const { user, isRestoring, sessionError, refreshSession } = useAuth();
  const isSaved = kind === 'saved';
  const mine = useApiResource(user && !isSaved ? getMyIdeas : null, user?.id);
  const bookmarks = useSavedIdeas(isSaved);
  const resource = isSaved ? bookmarks : mine;
  const archiving = useRef(false);
  const [archivePending, setArchivePending] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [confirmArchive, setConfirmArchive] = useState<string>();

  useEffect(() => {
    if (mine.error instanceof ApiError && mine.error.status === 401) void refreshSession();
  }, [mine.error, refreshSession]);

  async function archive(id: string) {
    if (archiving.current) return;
    archiving.current = true;
    setArchivePending(true);
    setArchiveError('');
    try {
      await archiveIdea(id);
      setConfirmArchive(undefined);
      mine.reload();
    } catch (error) {
      setArchiveError(apiErrorMessage(error, 'Could not archive this idea.'));
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) await refreshSession();
    } finally {
      archiving.current = false;
      setArchivePending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <TopNav activeTab={isSaved ? 'saved' : 'my-ideas'} />
      <main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-[120px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-[32px] font-extrabold text-[#0f1b2d]">{isSaved ? 'Saved ideas' : 'My ideas'}</h1>
          {!isSaved && user?.role === 'STUDENT' && <Link href="/publish" className="rounded-[10px] bg-[#4865ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3144aa]">Start an idea</Link>}
        </div>
        {(archiveError || bookmarks.actionError) && <p role="alert" className="mb-4 rounded-[10px] border border-red-200 bg-white p-3 text-sm text-red-700">{archiveError || bookmarks.actionError}</p>}
        {isRestoring || resource.loading ? (
          <p role="status" className="rounded-[16px] bg-white p-8 text-center text-sm text-[#64748b]">Loading ideas…</p>
        ) : !user ? (
          <div className="rounded-[16px] border border-[#e4e9f0] bg-white p-8 text-center">
            <p className="mb-3 text-sm text-[#64748b]">Sign in to see {isSaved ? 'your saved ideas' : 'your drafts and published ideas'}.</p>
            {sessionError && (
              <p role="alert" className="mb-3 text-sm text-red-700">{sessionError}{' '}
                <button type="button" className="underline" onClick={() => void refreshSession()}>Retry session check</button>
              </p>
            )}
            <Link href={loginHref(isSaved ? '/saved' : '/my-ideas')} className={buttonStyle}>Sign in</Link>
          </div>
        ) : resource.error ? (
          <div role="alert" className="rounded-[16px] bg-white p-8 text-center">
            <p className="mb-3 text-sm text-red-700">{apiErrorMessage(resource.error, 'Could not load ideas.')}</p>
            <button type="button" className={buttonStyle} onClick={resource.reload}>Try again</button>
          </div>
        ) : resource.data?.length ? (
          <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 lg:grid-cols-3">
            {resource.data.map((idea) => (
              <div key={idea.id} className="flex min-w-0 flex-col gap-2">
                <div className="flex-1">
                  <IdeaCard idea={idea} bookmark={isSaved ? {
                    saved: true, disabled: bookmarks.saving, toggle: () => void bookmarks.toggle(idea.id),
                  } : undefined} />
                </div>
                {!isSaved && idea.status !== 'ARCHIVED' && (
                  <div className="flex flex-wrap gap-2">
                    {confirmArchive === idea.id ? (
                      <>
                        <span className="w-full text-xs text-[#64748b]">Archive this idea? It will no longer be visible on the Pitch Board.</span>
                        <button type="button" className={buttonStyle} disabled={archivePending} onClick={() => void archive(idea.id)}>{archivePending ? 'Archiving…' : 'Confirm archive'}</button>
                        <button type="button" className={buttonStyle} disabled={archivePending} onClick={() => setConfirmArchive(undefined)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        {idea.status === 'DRAFT' && <Link href={`/publish?draft=${idea.id}`} className={buttonStyle}>Edit draft</Link>}
                        <button type="button" className={buttonStyle} disabled={archivePending} onClick={() => setConfirmArchive(idea.id)}>Archive</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#cbd5e1] bg-white p-8 text-center">
            <p className="mb-3 text-sm text-[#64748b]">{isSaved ? 'No saved ideas yet.' : 'No ideas created yet.'}</p>
            <Link href="/pitch-board" className={buttonStyle}>Browse the Pitch Board</Link>
          </div>
        )}
      </main>
    </div>
  );
}
