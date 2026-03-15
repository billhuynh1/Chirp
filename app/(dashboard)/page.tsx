import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wrench
} from 'lucide-react';
import { FeatureCard } from '@/components/marketing/feature-card';
import { HeroScreenshotFrame } from '@/components/marketing/hero-screenshot-frame';
import { SectionHeading } from '@/components/marketing/section-heading';
import { WorkflowStep } from '@/components/marketing/workflow-step';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser } from '@/lib/db/queries';

const featureCards = [
  {
    icon: Inbox,
    title: 'One inbox for incoming reviews',
    description:
      'See what is new, what is waiting on a draft, and what still needs a response in one place.'
  },
  {
    icon: ShieldCheck,
    title: 'Risk-aware review handling',
    description:
      'Negative reviews, safety concerns, billing disputes, and sensitive claims stay visible and gated for human review.'
  },
  {
    icon: ClipboardCheck,
    title: 'A workflow your team can follow',
    description:
      'Move from intake to draft to approval to posted without losing track of who needs to act next.'
  }
];

const workflowSteps = [
  {
    number: '01',
    icon: Inbox,
    title: 'Sync new reviews',
    description:
      'Chirp brings new Google Business Profile reviews into a live queue for the team.'
  },
  {
    number: '02',
    icon: TriangleAlert,
    title: 'Triage what matters',
    description:
      'Urgent, negative, or sensitive reviews rise to the top so your team can focus quickly.'
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Draft a reply',
    description:
      'AI creates a careful starting point that stays conservative around liability and unverified claims.'
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Approve and post',
    description:
      'A person reviews the final draft, posts it manually, and closes out the review.'
  }
];

export default async function HomePage() {
  const user = await getUser();

  return (
    <main className="marketing-shell flex-1 text-white">
      <section>
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pt-18">
          <div className="marketing-fade-up mx-auto max-w-5xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f8c7b5]">
                AI review workflow for home services
              </p>
              <h1 className="mt-6 text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.8rem] lg:leading-[0.98]">
                A clearer way to work through customer reviews.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Chirp helps home service teams manage Google reviews with one shared inbox,
                careful AI drafts, and a simple approval workflow before anything goes live.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {user ? (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full bg-[#ff8f70] px-6 text-slate-950 hover:bg-[#ff7f5c]"
                    >
                      <Link href="/dashboard">
                        Open dashboard
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/14 bg-white/6 px-6 text-white shadow-none hover:bg-white/12 hover:text-white"
                    >
                      <Link href="/pricing">See pricing</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full bg-[#ff8f70] px-6 text-slate-950 hover:bg-[#ff7f5c]"
                    >
                      <Link href="/sign-up">
                        Create account
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/14 bg-white/6 px-6 text-white shadow-none hover:bg-white/12 hover:text-white"
                    >
                      <Link href="/pricing">See pricing</Link>
                    </Button>
                  </>
                )}
              </div>

            </div>

            <div className="mt-12">
              <HeroScreenshotFrame
                src="/images/chirp-inbox-placeholder.svg"
                alt="Preview of Chirp's review inbox showing risk signals, draft status, and owner approvals."
              />
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="What Chirp Does"
          title="The app is built to keep review work organized"
          description="Chirp is not just a draft generator. It helps your team intake reviews, spot risk, move through approvals, and keep work from falling through the cracks."
          theme="dark"
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              theme="dark"
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <Card className="marketing-panel rounded-[2.25rem] border-white/10 bg-[#0d1824] py-0 shadow-none">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="max-w-2xl text-3xl tracking-tight text-white sm:text-[2.2rem] sm:leading-tight">
              Designed around a simple review workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 px-8 pb-8 text-sm leading-7 text-slate-300 lg:grid-cols-2">
            <p>
              Teams can see what is new, what needs a closer look, and which replies are waiting on approval.
              That makes it easier to respond consistently without relying on memory or scattered notes.
            </p>
            <p>
              Owners and managers stay in control of sensitive reviews while still giving the team a faster way to work through everyday responses.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Workflow"
          title="How the review process works in Chirp"
          description="Each step is meant to be easy to scan and repeat: bring the review in, decide what needs attention, draft carefully, then approve and post."
          theme="dark"
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {workflowSteps.map((step) => (
            <WorkflowStep
              key={step.number}
              number={step.number}
              icon={step.icon}
              title={step.title}
              description={step.description}
              theme="dark"
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Card className="marketing-panel overflow-hidden rounded-[2.4rem] border-white/10 bg-[#102030] py-0 shadow-none">
          <CardContent className="grid gap-8 px-8 py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12 lg:py-12">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#ffd1c3]">
                <Wrench className="size-4" />
                Made for home service businesses
              </div>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Give your team one place to manage review follow-through.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Chirp keeps review intake, drafting, approvals, and completion status in one workflow so nothing important slips through.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <Button asChild size="lg" className="rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100">
                    <Link href="/sign-up">Create account</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/15 bg-white/0 px-6 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
