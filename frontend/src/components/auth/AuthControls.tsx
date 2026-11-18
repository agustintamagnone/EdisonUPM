'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { ApiError } from '@/utils/api';
import { initials } from '@/utils/ideaDisplay';

const focusStyle = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3144aa]';
const landingStyle = 'inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-[8px] bg-[#0f1b2d] px-3 py-2 font-sans text-[clamp(12px,1.17vw,22px)] font-semibold leading-none text-white transition-colors hover:bg-[#1e293b] md:rounded-[0.94vw] md:px-[1.56vw] md:py-[0.86vw]';
const navStyle = 'inline-flex h-[38px] items-center justify-center whitespace-nowrap rounded-[10px] border border-[#e4e9f0] bg-white px-3 font-sans text-sm font-semibold text-[#334155] transition-colors hover:bg-[#f4f7fa]';

export function SignInLink({ className, children }: { className: string; children: ReactNode }) {
  const { user } = useAuth();
  if (user) return null;
  return <Link href="/login" className={`${className} ${focusStyle}`}>{children}</Link>;
}

export function AuthControls({ variant = 'nav' }: { variant?: 'landing' | 'nav' }) {
  const { user, isRestoring, isUpdating, signOut, refreshSession } = useAuth();
  const [error, setError] = useState('');
  const buttonStyle = `${variant === 'landing' ? landingStyle : navStyle} ${focusStyle}`;

  if (isRestoring) {
    return <span className={`${buttonStyle} invisible`} aria-hidden="true">Sign in</span>;
  }

  if (!user) return <Link href="/login" className={buttonStyle}>Sign in</Link>;

  async function handleSignOut() {
    setError('');
    try {
      await signOut();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setError('Could not verify the sign-out request. Please try again.');
        await refreshSession();
      } else {
        setError(error instanceof ApiError && error.status === undefined
          ? error.message
          : 'Could not sign out. Please try again.');
      }
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {variant === 'nav' && (
        <div className="flex min-w-0 items-center gap-2" title={user.fullName}>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4865ff] to-[#00adcc] text-xs font-bold text-white sm:h-9 sm:w-9"
            aria-hidden="true"
          >
              {initials(user.fullName)}
          </span>
          <span className="sr-only max-w-24 truncate text-sm font-semibold xl:not-sr-only 2xl:max-w-28">{user.fullName}</span>
        </div>
      )}
      <button type="button" onClick={handleSignOut} disabled={isUpdating} className={`${buttonStyle} disabled:opacity-60`}>
        {isUpdating ? 'Signing out…' : 'Sign out'}
      </button>
      {error && (
        <p role="alert" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700 shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}
