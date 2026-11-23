'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, apiErrorMessage } from '@/utils/api';
import { getCurrentUser, login, logout, type AuthUser, type LoginCredentials } from '@/utils/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isRestoring: boolean;
  isUpdating: boolean;
  sessionError: string;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const pendingUpdate = useRef(false);
  const sessionCheck = useRef<AbortController | null>(null);

  const refreshSession = useCallback(async () => {
    if (pendingUpdate.current || sessionCheck.current) return;

    const check = new AbortController();
    sessionCheck.current = check;
    try {
      const currentUser = await getCurrentUser(check.signal);
      if (!check.signal.aborted) {
        setUser(currentUser);
        setSessionError('');
      }
    } catch (error) {
      if (!check.signal.aborted) setSessionError(apiErrorMessage(error, 'Could not check your session.'));
    } finally {
      if (sessionCheck.current === check) sessionCheck.current = null;
      if (!check.signal.aborted) setIsRestoring(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
    window.addEventListener('focus', refreshSession);
    return () => {
      window.removeEventListener('focus', refreshSession);
      sessionCheck.current?.abort();
      sessionCheck.current = null;
    };
  }, [refreshSession]);

  async function updateSession(update: () => Promise<AuthUser | null>) {
    if (pendingUpdate.current) throw new ApiError('An authentication request is already in progress.');
    pendingUpdate.current = true;
    sessionCheck.current?.abort();
    sessionCheck.current = null;
    setIsUpdating(true);
    try {
      setUser(await update());
      setSessionError('');
    } finally {
      pendingUpdate.current = false;
      setIsRestoring(false);
      setIsUpdating(false);
    }
  }

  function signIn(credentials: LoginCredentials) {
    return updateSession(() => login(credentials));
  }

  function signOut() {
    return updateSession(async () => {
      try {
        await logout();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
      return null;
    });
  }

  return (
    <AuthContext.Provider value={{ user, isRestoring, isUpdating, sessionError, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth requires an AuthProvider.');
  return auth;
}
