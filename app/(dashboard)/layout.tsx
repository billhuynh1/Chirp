import Link from 'next/link';
import { getUser } from '@/lib/db/queries';
import { MarketingHeader } from '@/components/marketing/marketing-header';

export default async function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <section className="relative flex min-h-screen flex-col bg-[#08111b]">
      <MarketingHeader isAuthenticated={Boolean(user)} />
      <div className="relative z-10 flex-1">{children}</div>
      <footer className="relative z-10 border-t border-white/10 px-4 py-6 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        <Link href="/pricing" className="transition hover:text-slate-300">
          Pricing
        </Link>
      </footer>
    </section>
  );
}
