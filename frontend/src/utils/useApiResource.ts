'use client';

import { useCallback, useEffect, useState } from 'react';

type Request<T> = (signal: AbortSignal) => Promise<T>;
type Result<T> = { request: Request<T>; version: number; scope?: string; data?: T; error?: Error };

export function useApiResource<T>(request: Request<T> | null, scope?: string) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T>>();
  const reload = useCallback(() => setVersion((previous) => previous + 1), []);

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    request(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ request, version, scope, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ request, version, scope, error: error instanceof Error ? error : new Error('Request failed.') });
        }
      },
    );
    return () => controller.abort();
  }, [request, version, scope]);

  const current = result?.request === request && result.version === version && result.scope === scope ? result : undefined;
  return { data: current?.data, error: current?.error, loading: !!request && !current, reload };
}
