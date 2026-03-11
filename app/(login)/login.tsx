'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M21.8 12.23c0-.73-.06-1.26-.19-1.82H12v3.42h5.65c-.11.85-.7 2.13-2.01 2.99l-.02.11 2.79 2.16.19.02c1.73-1.59 2.72-3.93 2.72-6.88Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.07-.91 6.76-2.48l-3.22-2.5c-.86.6-2 .99-3.54.99-2.7 0-4.99-1.78-5.8-4.24l-.1.01-2.9 2.24-.03.1A10.22 10.22 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.2 13.77A6.14 6.14 0 0 1 5.88 12c0-.61.11-1.2.3-1.77l-.01-.12-2.94-2.27-.1.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.48l3.15-2.71Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.98c1.94 0 3.24.84 3.98 1.54l2.9-2.83C17.06 3 14.76 2 12 2 8.01 2 4.54 4.27 3.13 7.57l3.05 2.35C7 7.76 9.3 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  const searchParams = useSearchParams();
  const errorMessage = state?.error || searchParams.get('error') || '';
  const googleAuthHref = `/api/auth/google/start?mode=${mode}`;

  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <div className="hidden border-r border-black/10 bg-[#1f2a2a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#efb49f]">
            <CircleIcon className="h-5 w-5" />
            Chirp
          </div>
          <h1 className="mt-8 text-4xl font-semibold leading-tight">
            Reply to Google reviews faster without taking on unnecessary risk.
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-slate-300">
            Built for plumbing businesses that need a simple review inbox, safe
            AI drafts, and fast alerts when a negative review needs attention.
          </p>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <p>Google Business Profile import</p>
          <p>Urgent negative review alerts</p>
          <p>Manual-post workflow for V1</p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex justify-center lg:hidden">
            <CircleIcon className="h-12 w-12 text-[#c85c36]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-semibold tracking-tight text-slate-950">
            {mode === 'signin'
              ? 'Sign in to your workspace'
              : 'Create your review inbox'}
          </h2>
          <p className="mt-3 text-center text-sm text-slate-600">
            {mode === 'signin'
              ? 'Use Google or email/password to pick up where you left off.'
              : 'Use Google or email/password to create your workspace.'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-xl shadow-black/5">
            <div className="space-y-6">
              <Button
                asChild
                variant="outline"
                className="h-11 w-full rounded-2xl border-border/70 bg-background text-slate-900 hover:bg-muted/40"
              >
                <Link href={googleAuthHref}>
                  <GoogleIcon />
                  {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
                </Link>
              </Button>

              <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                <div className="h-px flex-1 bg-border/70" />
                <span>Or with email</span>
                <div className="h-px flex-1 bg-border/70" />
              </div>

              <form className="space-y-6" action={formAction}>
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Email
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      defaultValue={state.email}
                      required
                      maxLength={50}
                      className="h-11 rounded-2xl border-border/70 bg-background"
                      placeholder="owner@yourbusiness.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={
                        mode === 'signin' ? 'current-password' : 'new-password'
                      }
                      defaultValue={state.password}
                      required
                      minLength={8}
                      maxLength={100}
                      className="h-11 rounded-2xl border-border/70 bg-background"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-[#c85c36] text-white hover:bg-[#b64a25]"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : mode === 'signin' ? (
                    'Sign in'
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>
            </div>

            <div className="mt-6 border-t border-border/70 pt-6 text-center text-sm text-slate-600">
              {mode === 'signin'
                ? 'New to Chirp?'
                : 'Already have an account?'}{' '}
              <Link
                href={mode === 'signin' ? '/sign-up' : '/sign-in'}
                className="font-semibold text-[#9b4629] hover:text-[#7d3419]"
              >
                {mode === 'signin' ? 'Create an account' : 'Sign in'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
