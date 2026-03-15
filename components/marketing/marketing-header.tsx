import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CircleDot, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/(login)/actions';

type MarketingHeaderProps = {
  isAuthenticated: boolean;
};

const navItems = [
  { href: '#product', label: 'Platform' },
  { href: '#workflow', label: 'Workflow' },
  { href: '/pricing', label: 'Pricing' }
];

export function MarketingHeader({ isAuthenticated }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08111b]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-white"
        >
          <CircleDot className="size-5 text-[#ff8f70]" />
          Chirp
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" className="rounded-full text-slate-200 hover:bg-white/8 hover:text-white">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <form
                action={async () => {
                  'use server';
                  await signOut();
                  redirect('/');
                }}
              >
                <Button variant="outline" size="sm" className="rounded-full border-white/14 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full text-slate-200 hover:bg-white/8 hover:text-white">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild className="rounded-full bg-[#ff8f70] text-slate-950 hover:bg-[#ff7f5c]">
                <Link href="/sign-up">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
