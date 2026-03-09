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
    <section className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#fbf8f2_0%,#f6f1e8_52%,#f3ede4_100%)] dark:bg-[linear-gradient(180deg,#07130f_0%,#0d1c18_50%,#12261f_100%)]">
      <MarketingHeader isAuthenticated={Boolean(user)} />
      {children}
    </section>
  );
}
