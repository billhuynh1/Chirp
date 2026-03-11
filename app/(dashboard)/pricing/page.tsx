import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  {
    name: 'Founding',
    price: '$49',
    description: 'Per location / month for the first 5 customers.',
    features: ['Google review inbox', 'AI draft generation', 'Urgent email alerts']
  },
  {
    name: 'Standard',
    price: '$79',
    description: 'Per location / month with a soft 100-review cap.',
    features: ['Everything in Founding', 'Multi-location support', 'Priority onboarding']
  }
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b4629]">
          Pricing
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950 dark:text-white">
          Simple pricing for local home service teams
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Start with one location, keep the workflow tight, and expand after the
          inbox is working for your team.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className="bg-card/90 dark:bg-[#111b1d]/90"
          >
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold text-slate-950 dark:text-white">{plan.price}</div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Button className="mt-8 rounded-full bg-[#c85c36] text-white hover:bg-[#b64a25]">
                Join waitlist
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
