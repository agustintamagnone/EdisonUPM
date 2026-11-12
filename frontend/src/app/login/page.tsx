'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { IconArrowLeft, IconGlobe, IconLock } from '@/components/ui/Icons';
import { ApiError } from '@/utils/api';
import { postLoginDestination } from '@/utils/loginNavigation';

const inputStyle = 'mt-2 block w-full rounded-[10px] border border-line bg-surface-bg px-3.5 py-3 text-base text-ink-900 outline-none placeholder:text-ink-500 focus:border-brand-violet-true focus:ring-2 focus:ring-brand-violet-true-50';
const primaryStyle = 'inline-flex min-h-12 items-center justify-center rounded-[10px] bg-brand-violet-true px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-violet-700 disabled:opacity-60';
const optionStyle = 'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-line px-2 py-2 text-center text-sm font-semibold text-ink-700 peer-checked:border-brand-violet-true peer-checked:bg-brand-violet-true-50 peer-checked:text-brand-violet-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-violet-700 peer-focus-visible:ring-offset-2 peer-disabled:cursor-default';

export default function LoginPage() {
  const { user, isRestoring, isUpdating, sessionError, refreshSession, signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [destination, setDestination] = useState('/pitch-board');

  useEffect(() => {
    setDestination(postLoginDestination(new URLSearchParams(window.location.search).get('next')));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUpdating) return;
    setError('');

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const accountType = form.get('accountType');

    if (!email || !password || (accountType !== 'UPM_ACCOUNT' && accountType !== 'EXTERNAL_USER')) {
      setError('Enter your email and password and select an account type.');
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError('This password is too long. Enter the password for your Edison account.');
      return;
    }

    try {
      await signIn({ email, password, accountType });
      router.replace(postLoginDestination(new URLSearchParams(window.location.search).get('next')));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setError('Check your email, password, and account type, then try again.');
      } else if (error instanceof ApiError && error.status === 403) {
        setError('Could not verify the sign-in request. Please try again.');
      } else {
        setError(error instanceof ApiError && error.status === undefined
          ? error.message
          : 'Could not sign in. Please try again.');
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg font-inter">
      <header className="border-b border-line border-t-4 border-t-brand-gold bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center px-5 sm:px-8 lg:px-[120px]">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-violet-700">
            <Image src="/assets/logo-primary.svg" alt="" width={38} height={34} className="h-[34px] w-[38px] object-contain" />
            <span className="font-[family-name:var(--font-plus-jakarta)] text-lg font-extrabold tracking-tight text-ink-900">
              EDISON <span className="text-brand-violet-true">UPM</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:px-6 sm:py-16">
        <section aria-labelledby="login-title" className="w-full max-w-[480px] rounded-[18px] border border-line bg-white p-6 shadow-sm sm:p-9">
          <h1 id="login-title" className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Sign in
          </h1>

          {isRestoring ? (
            <p role="status" className="mt-4 text-sm text-ink-500">Checking your session…</p>
          ) : user ? (
            <div className="mt-4 space-y-5">
              <p className="text-sm text-ink-700">You’re signed in as <strong>{user.fullName}</strong>.</p>
              <Link href={destination} className={primaryStyle}>{destination === '/pitch-board' ? 'Continue to the Pitch Board' : 'Continue'}</Link>
            </div>
          ) : (
            <form method="post" onSubmit={handleSubmit} onChange={() => setError('')} className="mt-7 space-y-5" aria-busy={isUpdating}>
              {sessionError && !error && (
                <p role="alert" className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  Could not check your session. {sessionError}{' '}
                  <button type="button" className="font-semibold underline" disabled={isUpdating} onClick={() => void refreshSession()}>Retry session check</button>
                </p>
              )}
              <fieldset disabled={isUpdating}>
                <legend className="text-sm font-semibold text-ink-900">Account type</legend>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <input type="radio" name="accountType" value="UPM_ACCOUNT" className="peer sr-only" defaultChecked required />
                    <span className={optionStyle}>
                      <IconLock className="hidden shrink-0 min-[360px]:block" size={16} />
                      UPM Account
                    </span>
                  </label>
                  <label className="block">
                    <input type="radio" name="accountType" value="EXTERNAL_USER" className="peer sr-only" required />
                    <span className={optionStyle}>
                      <IconGlobe className="hidden shrink-0 min-[360px]:block" size={16} />
                      External User
                    </span>
                  </label>
                </div>
              </fieldset>

              <div>
                <label htmlFor="email" className="text-sm font-semibold text-ink-900">Email address</label>
                <input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" required disabled={isUpdating} className={inputStyle} />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-semibold text-ink-900">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required disabled={isUpdating} className={inputStyle} />
              </div>

              <div>
                {error && (
                  <p role="alert" className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={isUpdating} className={`${primaryStyle} w-full`}>
                  {isUpdating ? 'Signing in…' : 'Sign in'}
                </button>
                <span role="status" className="sr-only">{isUpdating ? 'Signing in…' : ''}</span>
              </div>
            </form>
          )}

          {!user && (
            <Link href="/pitch-board" className="mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-ink-700 hover:text-brand-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-violet-700">
              <IconArrowLeft size={15} />
              Browse the Pitch Board
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
