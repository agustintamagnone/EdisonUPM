'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ApiError, apiErrorMessage } from '@/utils/api';
import { getSavedIdeas, setSavedIdea } from '@/utils/ideas';
import { useApiResource } from '@/utils/useApiResource';

export function useSavedIdeas(enabled = true) {
  const { user, refreshSession } = useAuth();
  const resource = useApiResource(user && enabled ? getSavedIdeas : null, user?.id);
  useEffect(() => {
    if (resource.error instanceof ApiError && resource.error.status === 401) void refreshSession();
  }, [resource.error, refreshSession]);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  async function toggle(id: string) {
    if (!user || !resource.data || pending.current) return;
    const saved = resource.data.some((idea) => idea.id === id);
    pending.current = true;
    setSaving(true);
    setActionError('');
    try {
      await setSavedIdea(id, !saved);
      resource.reload();
    } catch (error) {
      setActionError(apiErrorMessage(error, 'Could not update the saved idea.'));
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await refreshSession();
      }
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return { ...resource, saving, actionError, toggle };
}
