import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CircleDot, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/(login)/actions';

type MarketingHeaderProps = {
  isAuthenticated: boolean;
};

const navItems = [
  { href: '#product', label: 'Product' },
  { href: '#workflow', label: 'Workflow' },
  { href: '/pricing', label: 'Pricing' }
];

export function MarketingHeader({ isAuthenticated }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f2ea]/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#090d12]/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-slate-950 dark:text-white"
        >
          <CircleDot className="size-5 text-[#c85c36] dark:text-[#f0b7a0]" />
          Chirp
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-slate-950 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" className="rounded-full text-slate-700 dark:text-slate-200">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <form
                action={async () => {
                  'use server';
                  await signOut();
                  redirect('/');
                }}
              >
                <Button variant="outline" size="sm" className="rounded-full">
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full text-slate-700 dark:text-slate-200">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-[#1f2a2a] text-white hover:bg-[#162020] dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Link href="/sign-up">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
