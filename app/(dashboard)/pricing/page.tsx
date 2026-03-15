import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const betaNotes = [
  'Pricing is not public yet while Chirp is in beta.',
  'Early customers are getting hands-on onboarding and product support.',
  'If you are interested, create an account and we can follow up as access expands.'
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b4629]">
          Pricing
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Chirp is currently in beta
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          We are keeping pricing private for now while we refine the product with early
          home service teams.
        </p>
      </div>

      <Card className="mx-auto mt-12 max-w-2xl bg-card/90 dark:bg-[#111b1d]/90">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-950 dark:text-slate-100">
            Beta access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
            {betaNotes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-[#c85c36] text-white hover:bg-[#b64a25]">
              <Link href="/sign-up">Create account</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
